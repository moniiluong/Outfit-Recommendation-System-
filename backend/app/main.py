"""
FastAPI backend for Outfit Recommendation System
"""
import os
import httpx
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import init_db, get_db, User, FeedbackHistory, ModelWeights, WeatherHistory
from app.services.ml_recommendation_engine import MLRecommendationEngine
from app.services.weather_pattern_analyzer import WeatherPatternAnalyzer
from app.services.user_preference_learning import UserPreferenceLearning

load_dotenv()

app = FastAPI(title="Outfit Recommendation API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for requests/responses
class WeatherRequest(BaseModel):
    lat: float
    lon: float
    user_id: Optional[str] = "default_user"


class RecommendationRequest(BaseModel):
    current_weather: Dict[str, Any]
    forecast: List[Dict[str, Any]]
    user_context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = "default_user"


class FeedbackRequest(BaseModel):
    user_id: str = "default_user"
    recommendation: Dict[str, Any]
    feedback: str
    weather_context: Dict[str, Any]


class UserDataExport(BaseModel):
    user_id: str = "default_user"


class UserDataImport(BaseModel):
    user_id: str = "default_user"
    data: Dict[str, Any]


def build_user_profile(user: Optional[User]) -> Dict[str, Any]:
    """Build the ML user profile shape expected by backend services."""
    if not user:
        return {
            'categoryPreferences': {},
            'itemPreferences': {},
            'feedbackHistory': []
        }

    return {
        'categoryPreferences': user.category_preferences or {},
        'itemPreferences': user.item_preferences or {},
        'feedbackHistory': []
    }


def load_model_weights(db: Session, user_id: str) -> Dict[str, float]:
    """Load persisted model weights for a user."""
    weights = db.query(ModelWeights).filter(ModelWeights.user_id == user_id).all()
    return {weight.feature_key: weight.weight for weight in weights}


def serialize_feedback_records(feedback_records: List[FeedbackHistory]) -> List[Dict[str, Any]]:
    """Convert feedback rows into the learning system's expected format."""
    return [
        {
            'timestamp': record.timestamp.timestamp() * 1000,
            'recommendation': {
                'item': record.item,
                'category': record.category,
                'confidence': record.confidence
            },
            'feedback': record.feedback,
            'weatherContext': {
                'temperature': record.temperature,
                'condition': record.condition,
                'timeOfDay': record.time_of_day
            },
            'sessionId': record.session_id
        }
        for record in feedback_records
    ]


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Outfit Recommendation API is running"}


@app.post("/api/weather")
async def get_weather(request: WeatherRequest, db: Session = Depends(get_db)):
    """
    Fetch weather data from OpenWeatherMap API
    """
    api_key = os.getenv("REACT_APP_WEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Weather API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            # Get current weather
            current_response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": request.lat,
                    "lon": request.lon,
                    "appid": api_key,
                    "units": "metric"
                },
                timeout=10.0
            )
            current_response.raise_for_status()
            current_data = current_response.json()

            # Get forecast
            forecast_response = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": request.lat,
                    "lon": request.lon,
                    "appid": api_key,
                    "units": "metric"
                },
                timeout=10.0
            )
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()

        # Format response to match frontend expectations
        formatted_current = {
            "current": {
                "temperature": current_data["main"]["temp"],
                "condition": current_data["weather"][0]["main"],
                "description": current_data["weather"][0]["description"],
                "humidity": current_data["main"]["humidity"],
                "wind": {
                    "speed": current_data["wind"]["speed"]
                }
            },
            "location": {
                "name": current_data["name"],
                "country": current_data["sys"]["country"]
            }
        }

        # Format forecast
        formatted_forecast = [
            {
                "dt": item["dt"],
                "temp": item["main"]["temp"],
                "condition": item["weather"][0]["main"],
                "description": item["weather"][0]["description"]
            }
            for item in forecast_data["list"]
        ]

        return {
            "current": formatted_current,
            "forecast": formatted_forecast
        }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather API error: {str(e)}")


@app.post("/api/recommendations")
async def get_recommendations(request: RecommendationRequest, db: Session = Depends(get_db)):
    """
    Generate outfit recommendations based on weather analysis
    """
    try:
        # Load user data from database
        user = db.query(User).filter(User.user_id == request.user_id).first()

        user_profile = build_user_profile(user)
        model_weights = load_model_weights(db, request.user_id)

        # Load weather history
        weather_history_records = (
            db.query(WeatherHistory)
            .filter(WeatherHistory.user_id == request.user_id)
            .order_by(WeatherHistory.timestamp.desc())
            .limit(100)
            .all()
        )
        historical_data = [w.analysis_data for w in weather_history_records if w.analysis_data]

        # Initialize services
        weather_analyzer = WeatherPatternAnalyzer(historical_data=historical_data)
        ml_engine = MLRecommendationEngine(user_profile=user_profile, model_weights=model_weights)

        # Analyze weather
        weather_analysis = weather_analyzer.analyze_weather_data(
            request.current_weather,
            request.forecast
        )

        # Generate recommendations
        recommendations = ml_engine.generate_recommendations(
            weather_analysis,
            request.user_context or {}
        )

        # Save weather history
        new_weather_record = WeatherHistory(
            user_id=request.user_id,
            temperature=weather_analysis['currentConditions']['temperature'],
            feels_like=weather_analysis['currentConditions']['feelsLike'],
            condition=weather_analysis['currentConditions']['condition'],
            humidity=weather_analysis['currentConditions']['humidity'],
            wind_speed=weather_analysis['currentConditions']['windSpeed'],
            analysis_data=weather_analysis
        )
        db.add(new_weather_record)
        db.commit()

        return {
            "recommendations": recommendations,
            "weatherAnalysis": weather_analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@app.post("/api/feedback")
async def record_feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    """
    Record user feedback on a recommendation
    """
    try:
        # Load user data
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            user = User(
                user_id=request.user_id,
                category_preferences={},
                item_preferences={}
            )
            db.add(user)

        user_profile = build_user_profile(user)
        model_weights = load_model_weights(db, request.user_id)

        # Load feedback history
        feedback_records = (
            db.query(FeedbackHistory)
            .filter(FeedbackHistory.user_id == request.user_id)
            .order_by(FeedbackHistory.timestamp.desc())
            .limit(200)
            .all()
        )
        feedback_history = serialize_feedback_records(feedback_records)

        # Initialize services
        ml_engine = MLRecommendationEngine(user_profile=user_profile, model_weights=model_weights)
        learning_system = UserPreferenceLearning(ml_engine, feedback_history=feedback_history)

        # Record feedback
        feedback_entry = learning_system.record_feedback(
            request.recommendation,
            request.feedback,
            request.weather_context
        )

        # Save feedback to database
        new_feedback = FeedbackHistory(
            user_id=request.user_id,
            item=request.recommendation['item'],
            category=request.recommendation['category'],
            feedback=request.feedback,
            confidence=request.recommendation.get('confidence', 0),
            temperature=request.weather_context['temperature'],
            condition=request.weather_context.get('condition', ''),
            time_of_day=request.weather_context.get('timeOfDay', ''),
            session_id=feedback_entry['sessionId']
        )
        db.add(new_feedback)

        # Update user profile
        user.category_preferences = ml_engine.user_profile['categoryPreferences']
        user.item_preferences = ml_engine.user_profile['itemPreferences']

        # Update model weights
        for feature_key, weight in ml_engine.model_weights.items():
            existing_weight = (
                db.query(ModelWeights)
                .filter(
                    ModelWeights.user_id == request.user_id,
                    ModelWeights.feature_key == feature_key
                )
                .first()
            )
            if existing_weight:
                existing_weight.weight = weight
            else:
                new_weight = ModelWeights(
                    user_id=request.user_id,
                    feature_key=feature_key,
                    weight=weight
                )
                db.add(new_weight)

        db.commit()

        return {
            "success": True,
            "feedbackEntry": feedback_entry
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Feedback error: {str(e)}")


@app.post("/api/user/insights")
async def get_user_insights(request: UserDataExport, db: Session = Depends(get_db)):
    """
    Get personalized insights for a user
    """
    try:
        # Load user data
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            return {
                "dataPoints": 0,
                "message": "No user data found",
                "insights": []
            }

        user_profile = build_user_profile(user)
        model_weights = load_model_weights(db, request.user_id)

        # Load feedback history
        feedback_records = (
            db.query(FeedbackHistory)
            .filter(FeedbackHistory.user_id == request.user_id)
            .order_by(FeedbackHistory.timestamp.desc())
            .all()
        )
        feedback_history = serialize_feedback_records(feedback_records)

        # Initialize services
        ml_engine = MLRecommendationEngine(user_profile=user_profile, model_weights=model_weights)
        learning_system = UserPreferenceLearning(ml_engine, feedback_history=feedback_history)

        insights = learning_system.get_personalized_insights()

        return insights

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights error: {str(e)}")


@app.post("/api/user/export")
async def export_user_data(request: UserDataExport, db: Session = Depends(get_db)):
    """
    Export user data for backup
    """
    try:
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        feedback_records = db.query(FeedbackHistory).filter(FeedbackHistory.user_id == request.user_id).all()

        user_profile = build_user_profile(user)
        model_weights = load_model_weights(db, request.user_id)
        feedback_history = serialize_feedback_records(feedback_records)

        ml_engine = MLRecommendationEngine(user_profile=user_profile, model_weights=model_weights)
        learning_system = UserPreferenceLearning(ml_engine, feedback_history=feedback_history)

        return learning_system.export_user_data()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


@app.delete("/api/user/clear")
async def clear_user_data(request: UserDataExport, db: Session = Depends(get_db)):
    """
    Clear all user data
    """
    try:
        # Delete all user data
        db.query(FeedbackHistory).filter(FeedbackHistory.user_id == request.user_id).delete()
        db.query(ModelWeights).filter(ModelWeights.user_id == request.user_id).delete()
        db.query(WeatherHistory).filter(WeatherHistory.user_id == request.user_id).delete()

        user = db.query(User).filter(User.user_id == request.user_id).first()
        if user:
            user.category_preferences = {}
            user.item_preferences = {}

        db.commit()

        return {"success": True, "message": "All user data cleared"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Clear data error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
