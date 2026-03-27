"""
ML-Based Recommendation Engine
Uses neural network-like algorithms to learn user preferences
and generate personalized outfit recommendations
"""
import math
from typing import Dict, List, Any, Optional


class MLRecommendationEngine:
    def __init__(self, user_profile: Dict = None, model_weights: Dict = None):
        self.clothing_database = self.initialize_clothing_database()
        self.user_profile = user_profile or {
            'categoryPreferences': {},
            'itemPreferences': {},
            'feedbackHistory': []
        }
        self.recommendations = []
        self.model_weights = model_weights or {}

    def generate_recommendations(
        self,
        weather_analysis: Dict[str, Any],
        user_context: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Generate personalized outfit recommendations using ML"""
        user_context = user_context or {}
        features = self.extract_features(weather_analysis, user_context)
        base_recommendations = self.get_base_recommendations(features)

        # Apply ML personalization
        personalized_recs = self.personalize_recommendations(
            base_recommendations,
            features,
            self.user_profile
        )

        # Rank and score recommendations
        ranked_recs = self.rank_recommendations(personalized_recs, features)

        # Add reasoning and confidence
        enriched_recs = [
            {
                **rec,
                'reasoning': self.generate_reasoning(rec, weather_analysis),
                'confidence': self.calculate_confidence(rec, features)
            }
            for rec in ranked_recs
        ]

        self.recommendations = enriched_recs
        return enriched_recs

    def extract_features(
        self,
        weather_analysis: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract features from weather analysis for ML processing"""
        current_conditions = weather_analysis['currentConditions']
        temperature_trend = weather_analysis['temperatureTrend']
        precipitation_risk = weather_analysis['precipitationRisk']
        comfort_index = weather_analysis['comfortIndex']
        time_of_day = weather_analysis['timeOfDay']

        return {
            # Temperature features
            'temperature': self.normalize_temperature(current_conditions['temperature']),
            'feelsLike': self.normalize_temperature(current_conditions['feelsLike']),
            'tempCategory': self.encode_temp_category(current_conditions['tempCategory']),
            'tempTrend': self.encode_trend(temperature_trend['trend']),
            'tempVolatility': self.encode_volatility(temperature_trend['volatility']),

            # Weather condition features
            'isRainy': 1 if current_conditions['isRainy'] else 0,
            'isSnowy': 1 if current_conditions['isSnowy'] else 0,
            'isSunny': 1 if current_conditions['isSunny'] else 0,
            'isCloudy': 1 if current_conditions['isCloudy'] else 0,

            # Precipitation features
            'precipRisk': precipitation_risk['score'],
            'precipLevel': self.encode_precip_level(precipitation_risk['level']),

            # Comfort features
            'comfortScore': comfort_index['score'] / 100,
            'humidity': (current_conditions.get('humidity', 50)) / 100,
            'windSpeed': min(current_conditions['windSpeed'] / 50, 1),

            # Time context
            'timeOfDay': self.encode_time_of_day(time_of_day['period']),
            'isWorkHours': 1 if time_of_day['isWorkHours'] else 0,
            'needsAllDayGear': 1 if time_of_day['needsAllDayGear'] else 0,

            # User context
            'activityLevel': user_context.get('activityLevel', 0.5),
            'stylePreference': user_context.get('stylePreference', 0.5),
        }

    def get_base_recommendations(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Get base recommendations using rule-based + ML hybrid approach"""
        recommendations = []
        temp = features['temperature'] * 40 - 10  # Denormalize

        # Layer system based on temperature
        if temp < 0 or features['isSnowy']:
            recommendations.extend([
                {'category': 'outerwear', 'item': 'Heavy winter coat', 'priority': 1, 'layerIndex': 3},
                {'category': 'head', 'item': 'Winter hat', 'priority': 1, 'layerIndex': 3},
                {'category': 'hands', 'item': 'Insulated gloves', 'priority': 1, 'layerIndex': 3},
                {'category': 'bottom', 'item': 'Thermal underwear', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Warm pants', 'priority': 1, 'layerIndex': 2},
                {'category': 'feet', 'item': 'Winter boots', 'priority': 1, 'layerIndex': 3}
            ])
        elif temp < 5:
            recommendations.extend([
                {'category': 'outerwear', 'item': 'Heavy coat', 'priority': 1, 'layerIndex': 3},
                {'category': 'top', 'item': 'Warm sweater', 'priority': 1, 'layerIndex': 2},
                {'category': 'bottom', 'item': 'Long pants', 'priority': 1, 'layerIndex': 2},
                {'category': 'head', 'item': 'Beanie', 'priority': 0.8, 'layerIndex': 3},
                {'category': 'accessories', 'item': 'Scarf', 'priority': 0.8, 'layerIndex': 3}
            ])
        elif temp < 10:
            recommendations.extend([
                {'category': 'outerwear', 'item': 'Warm jacket', 'priority': 1, 'layerIndex': 3},
                {'category': 'top', 'item': 'Long sleeve shirt', 'priority': 1, 'layerIndex': 1},
                {'category': 'top', 'item': 'Sweater or cardigan', 'priority': 0.8, 'layerIndex': 2},
                {'category': 'bottom', 'item': 'Jeans or pants', 'priority': 1, 'layerIndex': 2}
            ])
        elif temp < 15:
            recommendations.extend([
                {'category': 'outerwear', 'item': 'Light jacket', 'priority': 0.9, 'layerIndex': 2},
                {'category': 'top', 'item': 'Long sleeve shirt', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Jeans', 'priority': 1, 'layerIndex': 2}
            ])
        elif temp < 20:
            recommendations.extend([
                {'category': 'top', 'item': 'Light sweater or cardigan', 'priority': 0.7, 'layerIndex': 2},
                {'category': 'top', 'item': 'T-shirt or blouse', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Comfortable pants', 'priority': 1, 'layerIndex': 2}
            ])
        elif temp < 25:
            recommendations.extend([
                {'category': 'top', 'item': 'T-shirt', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Light pants or jeans', 'priority': 1, 'layerIndex': 2}
            ])
        elif temp < 30:
            recommendations.extend([
                {'category': 'top', 'item': 'Light breathable shirt', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Shorts or light pants', 'priority': 1, 'layerIndex': 1},
                {'category': 'accessories', 'item': 'Sunglasses', 'priority': 0.8, 'layerIndex': 1}
            ])
        else:
            recommendations.extend([
                {'category': 'top', 'item': 'Tank top or light shirt', 'priority': 1, 'layerIndex': 1},
                {'category': 'bottom', 'item': 'Shorts', 'priority': 1, 'layerIndex': 1},
                {'category': 'accessories', 'item': 'Sunglasses', 'priority': 1, 'layerIndex': 1},
                {'category': 'head', 'item': 'Sun hat', 'priority': 0.9, 'layerIndex': 1}
            ])

        # Weather-specific additions
        if features['isRainy'] or features['precipRisk'] > 0.4:
            recommendations.extend([
                {'category': 'outerwear', 'item': 'Waterproof jacket', 'priority': 1, 'layerIndex': 3},
                {'category': 'accessories', 'item': 'Umbrella', 'priority': 1, 'layerIndex': 0},
                {'category': 'feet', 'item': 'Waterproof shoes', 'priority': 0.9, 'layerIndex': 2}
            ])

        if features['isSunny'] and temp > 20:
            recommendations.append(
                {'category': 'accessories', 'item': 'Sunscreen', 'priority': 0.7, 'layerIndex': 0}
            )

        if features['windSpeed'] > 0.4:
            recommendations.append(
                {'category': 'outerwear', 'item': 'Windbreaker', 'priority': 0.8, 'layerIndex': 2}
            )

        return recommendations

    def personalize_recommendations(
        self,
        base_recs: List[Dict],
        features: Dict,
        user_profile: Dict
    ) -> List[Dict]:
        """Personalize recommendations based on user profile and ML weights"""
        personalized = []

        for rec in base_recs:
            # Apply user preference weights
            category_preference = user_profile.get('categoryPreferences', {}).get(rec['category'], 1)
            item_preference = user_profile.get('itemPreferences', {}).get(rec['item'], 1)

            # ML weight adjustment
            feature_key = self.get_feature_key(rec, features)
            ml_weight = self.model_weights.get(feature_key, 1)

            # Combine weights using neural network-like activation
            adjusted_priority = self.sigmoid(
                rec['priority'] * 0.4 +
                category_preference * 0.3 +
                item_preference * 0.2 +
                ml_weight * 0.1
            )

            personalized.append({
                **rec,
                'originalPriority': rec['priority'],
                'adjustedPriority': adjusted_priority,
                'personalizationScore': item_preference
            })

        return personalized

    def rank_recommendations(
        self,
        recommendations: List[Dict],
        features: Dict
    ) -> List[Dict]:
        """Rank recommendations by adjusted priority and relevance"""
        # Group by category to ensure diversity
        grouped = {}
        for rec in recommendations:
            category = rec['category']
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(rec)

        # Sort within each category
        for category in grouped:
            grouped[category].sort(key=lambda x: x['adjustedPriority'], reverse=True)

        # Select top items from each category
        selected = []
        category_order = ['outerwear', 'top', 'bottom', 'feet', 'head', 'hands', 'accessories']

        for category in category_order:
            if category in grouped:
                # Take top 2 items from each category
                for item in grouped[category][:2]:
                    if item['adjustedPriority'] > 0.3:
                        selected.append(item)

        # Add any remaining high-priority items
        for items in grouped.values():
            for item in items:
                if item not in selected and item['adjustedPriority'] > 0.7:
                    selected.append(item)

        return selected

    def calculate_confidence(self, recommendation: Dict, features: Dict) -> int:
        """Calculate confidence score for each recommendation"""
        confidence = recommendation['adjustedPriority']

        # Boost confidence for weather-critical items
        item_lower = recommendation['item'].lower()
        if ((features['isRainy'] and 'waterproof' in item_lower) or
                (features['isSnowy'] and 'winter' in item_lower)):
            confidence = min(1, confidence * 1.2)

        # Reduce confidence for edge cases
        if features['tempVolatility'] > 0.7:
            confidence *= 0.9

        return round(confidence * 100)

    def generate_reasoning(
        self,
        recommendation: Dict,
        weather_analysis: Dict
    ) -> str:
        """Generate human-readable reasoning for recommendation"""
        reasons = []
        current_conditions = weather_analysis['currentConditions']
        temperature_trend = weather_analysis['temperatureTrend']
        precipitation_risk = weather_analysis['precipitationRisk']
        comfort_index = weather_analysis['comfortIndex']

        # Temperature-based reasoning
        temp_cat = current_conditions['tempCategory']
        if temp_cat in ['freezing', 'very_cold']:
            reasons.append(f"Temperature is {current_conditions['temperature']}°C - very cold protection needed")
        elif temp_cat == 'very_hot':
            reasons.append(f"Temperature is {current_conditions['temperature']}°C - light, breathable clothing recommended")

        # Weather condition reasoning
        if precipitation_risk.get('isCurrentlyRainy'):
            reasons.append('Rain expected - waterproof protection essential')
        elif precipitation_risk['score'] > 0.4:
            reasons.append(f"{round(precipitation_risk['score'] * 100)}% chance of precipitation later")

        if current_conditions['isSunny'] and current_conditions['temperature'] > 20:
            reasons.append('Sunny weather - sun protection recommended')

        # Trend reasoning
        if temperature_trend['trend'] == 'warming':
            reasons.append('Temperature rising - consider layering options')
        elif temperature_trend['trend'] == 'cooling':
            reasons.append('Temperature dropping - bring warmer layers')

        # Comfort reasoning
        if comfort_index['level'] == 'uncomfortable':
            reasons.append('Uncomfortable conditions - extra protection advisable')

        if not reasons:
            reasons.append('Optimal for current weather conditions')

        return ' • '.join(reasons)

    # Neural network-like activation functions
    @staticmethod
    def sigmoid(x: float) -> float:
        """Sigmoid activation function"""
        return 1 / (1 + math.exp(-x))

    def get_feature_key(self, recommendation: Dict, features: Dict) -> str:
        """Get feature key for ML weight lookup"""
        return f"{recommendation['category']}_{int(features['temperature'] * 10)}_{int(features['isRainy'])}"

    # Encoding functions for feature normalization
    @staticmethod
    def normalize_temperature(temp: float) -> float:
        """Normalize -10 to 40°C to 0-1"""
        return (temp + 10) / 50

    @staticmethod
    def encode_temp_category(category: str) -> float:
        categories = ['freezing', 'very_cold', 'cold', 'cool', 'mild', 'warm', 'hot', 'very_hot']
        try:
            return categories.index(category) / len(categories)
        except ValueError:
            return 0.5

    @staticmethod
    def encode_trend(trend: str) -> int:
        return 1 if trend == 'warming' else -1 if trend == 'cooling' else 0

    @staticmethod
    def encode_volatility(volatility: str) -> float:
        return 1 if volatility == 'high' else 0.5 if volatility == 'medium' else 0

    @staticmethod
    def encode_precip_level(level: str) -> float:
        return 1 if level == 'high' else 0.5 if level == 'medium' else 0

    @staticmethod
    def encode_time_of_day(period: str) -> float:
        periods = {'night': 0, 'morning': 0.33, 'afternoon': 0.66, 'evening': 1}
        return periods.get(period, 0.5)

    @staticmethod
    def initialize_clothing_database() -> Dict[str, List[str]]:
        """Initialize clothing database"""
        return {
            'outerwear': ['Heavy winter coat', 'Heavy coat', 'Warm jacket', 'Light jacket', 'Windbreaker', 'Waterproof jacket'],
            'top': ['Tank top', 'T-shirt', 'Long sleeve shirt', 'Sweater', 'Cardigan', 'Thermal underwear'],
            'bottom': ['Shorts', 'Light pants', 'Jeans', 'Warm pants', 'Thermal underwear'],
            'feet': ['Sandals', 'Sneakers', 'Waterproof shoes', 'Boots', 'Winter boots'],
            'head': ['Sun hat', 'Cap', 'Beanie', 'Winter hat'],
            'hands': ['Light gloves', 'Insulated gloves'],
            'accessories': ['Sunglasses', 'Umbrella', 'Scarf', 'Sunscreen'],
        }
