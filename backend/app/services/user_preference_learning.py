"""
User Preference Learning System
Implements a feedback loop to continuously learn and adapt to user preferences
Uses reinforcement learning principles to improve recommendations over time
"""
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional


class UserPreferenceLearning:
    def __init__(self, ml_engine, feedback_history: List[Dict] = None):
        self.ml_engine = ml_engine
        self.learning_rate = 0.1
        self.feedback_history = feedback_history or []
        self.session_data = []
        self._session_id = None

    def record_feedback(
        self,
        recommendation: Dict[str, Any],
        feedback: str,
        weather_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Record user feedback on a recommendation
        feedback: 'like', 'dislike', 'worn', 'ignored', 'inappropriate'
        """
        feedback_entry = {
            'timestamp': datetime.now().timestamp() * 1000,
            'recommendation': {
                'item': recommendation['item'],
                'category': recommendation['category'],
                'confidence': recommendation.get('confidence', 0)
            },
            'feedback': feedback,
            'weatherContext': {
                'temperature': weather_context['temperature'],
                'condition': weather_context.get('condition', ''),
                'timeOfDay': weather_context.get('timeOfDay', '')
            },
            'sessionId': self.get_current_session_id()
        }

        self.feedback_history.append(feedback_entry)
        self.session_data.append(feedback_entry)

        # Update ML weights based on feedback
        self.update_model_weights(feedback_entry)

        # Update user profile
        self.update_user_profile(feedback_entry)

        return feedback_entry

    def update_model_weights(self, feedback_entry: Dict[str, Any]) -> None:
        """Update ML model weights using reinforcement learning"""
        recommendation = feedback_entry['recommendation']
        feedback = feedback_entry['feedback']
        weather_context = feedback_entry['weatherContext']

        # Calculate reward signal
        reward = self.calculate_reward(feedback)

        # Extract features
        features = {
            'temperature': self.normalize_temperature(weather_context['temperature']),
            'isRainy': 1 if 'rain' in weather_context['condition'].lower() else 0
        }

        # Update weight for this specific recommendation pattern
        feature_key = f"{recommendation['category']}_{int(features['temperature'] * 10)}_{features['isRainy']}"
        current_weight = self.ml_engine.model_weights.get(feature_key, 1)

        # Gradient descent update
        new_weight = current_weight + self.learning_rate * reward
        self.ml_engine.model_weights[feature_key] = max(0, min(2, new_weight))  # Clamp between 0 and 2

        # Also update related patterns (generalization)
        self.update_related_weights(feature_key, reward * 0.5)

    @staticmethod
    def calculate_reward(feedback: str) -> float:
        """Calculate reward signal from user feedback"""
        rewards = {
            'worn': 1.0,  # Strongest positive signal
            'like': 0.5,
            'ignored': -0.2,  # Mild negative signal
            'dislike': -0.5,
            'inappropriate': -1.0  # Strongest negative signal
        }
        return rewards.get(feedback, 0)

    def update_related_weights(self, feature_key: str, adjusted_reward: float) -> None:
        """Update related weights for generalization"""
        parts = feature_key.split('_')
        if len(parts) != 3:
            return

        category, temp_bucket, is_rainy = parts
        temp_num = int(temp_bucket)

        # Update adjacent temperature buckets
        for offset in [-1, 1]:
            related_key = f"{category}_{temp_num + offset}_{is_rainy}"
            current_weight = self.ml_engine.model_weights.get(related_key, 1)
            decay = 0.5 if abs(offset) == 1 else 0.25

            new_weight = current_weight + self.learning_rate * adjusted_reward * decay
            self.ml_engine.model_weights[related_key] = max(0, min(2, new_weight))

    def update_user_profile(self, feedback_entry: Dict[str, Any]) -> None:
        """Update user profile with preference learning"""
        recommendation = feedback_entry['recommendation']
        feedback = feedback_entry['feedback']
        profile = self.ml_engine.user_profile

        # Update category preferences
        if 'categoryPreferences' not in profile:
            profile['categoryPreferences'] = {}

        category_pref = profile['categoryPreferences'].get(recommendation['category'], 1)
        category_reward = self.calculate_reward(feedback) * 0.5
        profile['categoryPreferences'][recommendation['category']] = max(
            0, min(2, category_pref + self.learning_rate * category_reward)
        )

        # Update item preferences
        if 'itemPreferences' not in profile:
            profile['itemPreferences'] = {}

        item_pref = profile['itemPreferences'].get(recommendation['item'], 1)
        item_reward = self.calculate_reward(feedback)
        profile['itemPreferences'][recommendation['item']] = max(
            0, min(2, item_pref + self.learning_rate * item_reward)
        )

        # Store feedback in profile
        if 'feedbackHistory' not in profile:
            profile['feedbackHistory'] = []

        profile['feedbackHistory'].append({
            'timestamp': feedback_entry['timestamp'],
            'item': recommendation['item'],
            'feedback': feedback
        })

        # Keep only last 200 feedback entries
        if len(profile['feedbackHistory']) > 200:
            profile['feedbackHistory'] = profile['feedbackHistory'][-200:]

    def get_personalized_insights(self) -> Dict[str, Any]:
        """Get personalized insights based on learning"""
        if len(self.feedback_history) < 10:
            return {
                'dataPoints': len(self.feedback_history),
                'message': 'Keep providing feedback to get personalized insights!',
                'insights': []
            }

        insights = []
        profile = self.ml_engine.user_profile

        # Analyze category preferences
        category_prefs = profile.get('categoryPreferences', {})
        top_categories = sorted(
            category_prefs.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]

        if top_categories:
            insights.append({
                'type': 'preference',
                'title': 'Your Favorite Categories',
                'description': ', '.join(
                    f"{cat} ({round(score * 50)}% preference)"
                    for cat, score in top_categories
                )
            })

        # Analyze item preferences
        item_prefs = profile.get('itemPreferences', {})
        loved_items = [item for item, score in item_prefs.items() if score > 1.3]

        if loved_items:
            insights.append({
                'type': 'loved',
                'title': 'Items You Love',
                'description': ', '.join(loved_items[:5])
            })

        disliked_items = [item for item, score in item_prefs.items() if score < 0.7]

        if disliked_items:
            insights.append({
                'type': 'disliked',
                'title': 'Items You Avoid',
                'description': ', '.join(disliked_items[:5])
            })

        # Analyze weather patterns
        weather_patterns = self.analyze_weather_patterns()
        if weather_patterns:
            insights.append(weather_patterns)

        return {
            'dataPoints': len(self.feedback_history),
            'message': f"We've learned from {len(self.feedback_history)} of your feedback entries!",
            'insights': insights,
            'learningProgress': self.calculate_learning_progress()
        }

    def analyze_weather_patterns(self) -> Optional[Dict[str, str]]:
        """Analyze user's weather-based patterns"""
        recent_feedback = self.feedback_history[-50:]

        cold_weather_feedback = [
            f for f in recent_feedback
            if f['weatherContext']['temperature'] < 10
        ]

        warm_weather_feedback = [
            f for f in recent_feedback
            if f['weatherContext']['temperature'] > 20
        ]

        if len(cold_weather_feedback) > 5:
            cold_likes = sum(
                1 for f in cold_weather_feedback
                if f['feedback'] in ['like', 'worn']
            )
            cold_preference = cold_likes / len(cold_weather_feedback)

            if cold_preference > 0.7:
                return {
                    'type': 'weather_pattern',
                    'title': 'Cold Weather Preference',
                    'description': 'You seem to appreciate our cold weather recommendations!'
                }

        if len(warm_weather_feedback) > 5:
            warm_likes = sum(
                1 for f in warm_weather_feedback
                if f['feedback'] in ['like', 'worn']
            )
            warm_preference = warm_likes / len(warm_weather_feedback)

            if warm_preference > 0.7:
                return {
                    'type': 'weather_pattern',
                    'title': 'Warm Weather Preference',
                    'description': 'You love our warm weather recommendations!'
                }

        return None

    def calculate_learning_progress(self) -> Dict[str, Any]:
        """Calculate overall learning progress"""
        total_feedback = len(self.feedback_history)

        if total_feedback < 10:
            return {'level': 'beginner', 'percentage': 10}
        elif total_feedback < 30:
            return {'level': 'learning', 'percentage': 30}
        elif total_feedback < 50:
            return {'level': 'intermediate', 'percentage': 50}
        elif total_feedback < 100:
            return {'level': 'advanced', 'percentage': 70}
        else:
            return {'level': 'expert', 'percentage': 90}

    def get_session_analytics(self) -> Optional[Dict[str, Any]]:
        """Get session-based analytics"""
        total_recommendations = len(self.session_data)

        if total_recommendations == 0:
            return None

        liked = sum(
            1 for f in self.session_data
            if f['feedback'] in ['like', 'worn']
        )

        disliked = sum(
            1 for f in self.session_data
            if f['feedback'] in ['dislike', 'inappropriate']
        )

        return {
            'totalRecommendations': total_recommendations,
            'liked': liked,
            'disliked': disliked,
            'ignored': total_recommendations - liked - disliked,
            'satisfactionRate': liked / total_recommendations
        }

    def reset_session(self) -> None:
        """Reset session data (call when app restarts)"""
        self.session_data = []
        self._session_id = None

    def export_user_data(self) -> Dict[str, Any]:
        """Export user data for analysis or backup"""
        return {
            'feedbackHistory': self.feedback_history,
            'userProfile': self.ml_engine.user_profile,
            'modelWeights': self.ml_engine.model_weights,
            'exportDate': datetime.now().isoformat(),
            'dataPoints': len(self.feedback_history)
        }

    def import_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Import user data (for restore or migration)"""
        if 'feedbackHistory' in data:
            self.feedback_history = data['feedbackHistory']

        if 'userProfile' in data:
            self.ml_engine.user_profile = data['userProfile']

        if 'modelWeights' in data:
            self.ml_engine.model_weights = data['modelWeights']

        return {
            'success': True,
            'dataPoints': len(self.feedback_history)
        }

    def clear_all_data(self) -> Dict[str, Any]:
        """Clear all learning data (reset to defaults)"""
        self.feedback_history = []
        self.session_data = []
        self.ml_engine.user_profile = {
            'categoryPreferences': {},
            'itemPreferences': {},
            'feedbackHistory': []
        }
        self.ml_engine.model_weights = {}

        return {'success': True, 'message': 'All learning data cleared'}

    # Helper functions
    def get_current_session_id(self) -> str:
        """Get or create current session ID"""
        if not self._session_id:
            self._session_id = f"session_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:9]}"
        return self._session_id

    @staticmethod
    def normalize_temperature(temp: float) -> float:
        """Normalize temperature"""
        return (temp + 10) / 50
