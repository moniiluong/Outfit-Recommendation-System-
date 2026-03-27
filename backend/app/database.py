"""
Database models and setup for the outfit recommendation system
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./outfit_recommendations.db")

Base = declarative_base()


class User(Base):
    """User profile and preferences"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    category_preferences = Column(JSON, default={})
    item_preferences = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeedbackHistory(Base):
    """User feedback on recommendations"""
    __tablename__ = "feedback_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    item = Column(String)
    category = Column(String)
    feedback = Column(String)  # 'like', 'dislike', 'worn', 'ignored', 'inappropriate'
    confidence = Column(Float)
    temperature = Column(Float)
    condition = Column(String)
    time_of_day = Column(String)
    session_id = Column(String)


class ModelWeights(Base):
    """ML model weights"""
    __tablename__ = "model_weights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    feature_key = Column(String, index=True)
    weight = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WeatherHistory(Base):
    """Historical weather data for pattern analysis"""
    __tablename__ = "weather_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float)
    feels_like = Column(Float)
    condition = Column(String)
    humidity = Column(Float)
    wind_speed = Column(Float)
    analysis_data = Column(JSON)


# Database session management
engine = None
SessionLocal = None


def get_sync_database_url(database_url: str) -> str:
    """Convert async SQLite URLs into a sync SQLAlchemy URL for create_engine."""
    if database_url.startswith("sqlite+aiosqlite:///"):
        return database_url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
    if database_url.startswith("sqlite+aiosqlite://"):
        return database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return database_url


async def init_db():
    """Initialize the database"""
    global engine, SessionLocal
    engine = create_engine(
        get_sync_database_url(DATABASE_URL),
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
