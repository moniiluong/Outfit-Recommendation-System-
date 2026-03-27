"""
Weather Pattern Analyzer
Analyzes weather patterns, temperature ranges, and precipitation data
to identify trends and make intelligent predictions
"""
import math
from datetime import datetime
from typing import Dict, List, Any, Optional


class WeatherPatternAnalyzer:
    def __init__(self, historical_data: List[Dict] = None):
        self.historical_data = historical_data or []
        self.patterns = {
            'temperatureTrends': [],
            'precipitationPatterns': [],
            'seasonalData': {}
        }

    def analyze_weather_data(
        self,
        current_weather: Dict[str, Any],
        forecast: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze weather data to extract meaningful patterns"""
        analysis = {
            'currentConditions': self.analyze_current_conditions(current_weather),
            'temperatureTrend': self.analyze_temperature_trend(forecast),
            'precipitationRisk': self.analyze_precipitation_risk(current_weather, forecast),
            'comfortIndex': self.calculate_comfort_index(current_weather),
            'weatherStability': self.calculate_weather_stability(forecast),
            'timeOfDay': self.get_time_of_day_context()
        }

        # Store for historical learning
        self.store_weather_pattern(analysis)

        return analysis

    def analyze_current_conditions(self, weather: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current weather conditions with detailed metrics"""
        current = weather['current']
        temp = current['temperature']
        condition = (current.get('condition', '')).lower()

        return {
            'temperature': temp,
            'feelsLike': self.calculate_feels_like(temp, current),
            'tempCategory': self.categorize_temperature(temp),
            'condition': condition,
            'isRainy': 'rain' in condition or 'drizzle' in condition,
            'isSnowy': 'snow' in condition,
            'isCloudy': 'cloud' in condition,
            'isSunny': 'clear' in condition or 'sun' in condition,
            'humidity': current.get('humidity', 50),
            'windSpeed': current.get('wind', {}).get('speed', 0)
        }

    def analyze_temperature_trend(
        self,
        forecast: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze temperature trends from forecast data"""
        if not forecast or len(forecast) < 2:
            return {'trend': 'stable', 'change': 0, 'volatility': 'low'}

        temps = [f['temp'] for f in forecast]
        changes = [temps[i] - temps[i - 1] for i in range(1, len(temps))]

        avg_change = sum(changes) / len(changes)
        volatility = self.calculate_volatility(changes)

        return {
            'trend': 'warming' if avg_change > 2 else 'cooling' if avg_change < -2 else 'stable',
            'change': avg_change,
            'volatility': 'high' if volatility > 5 else 'medium' if volatility > 2 else 'low',
            'maxTemp': max(temps),
            'minTemp': min(temps),
            'range': max(temps) - min(temps)
        }

    def analyze_precipitation_risk(
        self,
        current_weather: Dict[str, Any],
        forecast: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze precipitation risk based on current and forecast data"""
        current_condition = (current_weather['current'].get('condition', '')).lower()
        is_currently_rainy = ('rain' in current_condition or
                              'drizzle' in current_condition or
                              'snow' in current_condition)

        forecast_rain_count = sum(
            1 for f in forecast
            if 'rain' in (f.get('condition', '')).lower() or
               'drizzle' in (f.get('condition', '')).lower() or
               'snow' in (f.get('condition', '')).lower()
        )

        risk_score = (0.5 if is_currently_rainy else 0) + (forecast_rain_count / len(forecast) * 0.5)

        return {
            'level': 'high' if risk_score > 0.6 else 'medium' if risk_score > 0.3 else 'low',
            'score': risk_score,
            'isCurrentlyRainy': is_currently_rainy,
            'forecastRainProbability': forecast_rain_count / len(forecast) if forecast else 0,
            'type': 'snow' if 'snow' in current_condition else 'rain' if 'rain' in current_condition else 'none'
        }

    def calculate_comfort_index(self, weather: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comfort index based on temperature, humidity, and wind"""
        current = weather['current']
        temp = current['temperature']
        humidity = current.get('humidity', 50)
        wind_speed = current.get('wind', {}).get('speed', 0)

        # Heat index calculation (simplified)
        comfort_score = 50

        if temp < 10:
            comfort_score -= (10 - temp) * 2
        elif temp > 28:
            comfort_score -= (temp - 28) * 2

        if humidity > 70:
            comfort_score -= (humidity - 70) * 0.5
        if wind_speed > 20:
            comfort_score -= (wind_speed - 20) * 0.3

        comfort_score = max(0, min(100, comfort_score))

        return {
            'score': comfort_score,
            'level': 'comfortable' if comfort_score > 70 else 'moderate' if comfort_score > 40 else 'uncomfortable',
            'factors': {
                'temperature': 'ideal' if 18 < temp < 26 else 'suboptimal',
                'humidity': 'ideal' if 30 < humidity < 60 else 'suboptimal',
                'wind': 'calm' if wind_speed < 15 else 'breezy'
            }
        }

    def calculate_weather_stability(
        self,
        forecast: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate weather stability from forecast"""
        if not forecast or len(forecast) < 2:
            return {'stable': True, 'score': 1}

        conditions = [f.get('condition', '') for f in forecast]
        unique_conditions = len(set(conditions))
        stability_score = 1 - (unique_conditions / len(conditions))

        return {
            'stable': stability_score > 0.6,
            'score': stability_score,
            'level': 'very stable' if stability_score > 0.7 else 'moderately stable' if stability_score > 0.4 else 'unstable'
        }

    def get_time_of_day_context(self) -> Dict[str, Any]:
        """Get time of day context for recommendations"""
        hour = datetime.now().hour

        if hour < 6:
            period = 'night'
        elif hour < 12:
            period = 'morning'
        elif hour < 17:
            period = 'afternoon'
        elif hour < 21:
            period = 'evening'
        else:
            period = 'night'

        return {
            'hour': hour,
            'period': period,
            'isWorkHours': 9 <= hour < 17,
            'needsAllDayGear': hour < 10
        }

    def calculate_feels_like(self, temp: float, current: Dict[str, Any]) -> float:
        """Calculate 'feels like' temperature"""
        wind_speed = current.get('wind', {}).get('speed', 0)
        humidity = current.get('humidity', 50)

        # Wind chill for cold weather
        if temp < 10 and wind_speed > 5:
            return temp - (wind_speed * 0.5)

        # Heat index for hot weather
        if temp > 27 and humidity > 40:
            return temp + ((humidity - 40) * 0.1)

        return temp

    @staticmethod
    def categorize_temperature(temp: float) -> str:
        """Categorize temperature into ranges"""
        if temp < 0:
            return 'freezing'
        elif temp < 5:
            return 'very_cold'
        elif temp < 10:
            return 'cold'
        elif temp < 15:
            return 'cool'
        elif temp < 20:
            return 'mild'
        elif temp < 25:
            return 'warm'
        elif temp < 30:
            return 'hot'
        else:
            return 'very_hot'

    @staticmethod
    def calculate_volatility(values: List[float]) -> float:
        """Calculate volatility (standard deviation)"""
        if not values:
            return 0

        mean = sum(values) / len(values)
        variance = sum((val - mean) ** 2 for val in values) / len(values)
        return math.sqrt(variance)

    def store_weather_pattern(self, analysis: Dict[str, Any]) -> None:
        """Store weather pattern for historical analysis"""
        self.historical_data.append({
            'timestamp': datetime.now().timestamp() * 1000,
            **analysis
        })

        # Keep only last 100 entries
        if len(self.historical_data) > 100:
            self.historical_data = self.historical_data[-100:]

    def get_seasonal_patterns(self) -> Optional[Dict[str, Any]]:
        """Get seasonal patterns from historical data"""
        month = datetime.now().month
        season = month // 3  # 0=winter, 1=spring, 2=summer, 3=fall

        seasonal_data = [
            entry for entry in self.historical_data
            if datetime.fromtimestamp(entry['timestamp'] / 1000).month // 3 == season
        ]

        if len(seasonal_data) < 5:
            return None  # Not enough data

        avg_temp = sum(
            entry['currentConditions']['temperature']
            for entry in seasonal_data
        ) / len(seasonal_data)

        rain_frequency = sum(
            1 for entry in seasonal_data
            if entry['precipitationRisk']['isCurrentlyRainy']
        ) / len(seasonal_data)

        return {
            'season': ['winter', 'spring', 'summer', 'fall'][season],
            'avgTemperature': avg_temp,
            'rainFrequency': rain_frequency,
            'dataPoints': len(seasonal_data)
        }
