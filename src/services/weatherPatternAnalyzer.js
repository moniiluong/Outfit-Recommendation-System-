/**
 * Weather Pattern Analyzer
 * Analyzes weather patterns, temperature ranges, and precipitation data
 * to identify trends and make intelligent predictions
 */

export class WeatherPatternAnalyzer {
  constructor() {
    this.historicalData = this.loadHistoricalData();
    this.patterns = {
      temperatureTrends: [],
      precipitationPatterns: [],
      seasonalData: {},
    };
  }

  /**
   * Analyze weather data to extract meaningful patterns
   */
  analyzeWeatherData(currentWeather, forecast) {
    const analysis = {
      currentConditions: this.analyzeCurrentConditions(currentWeather),
      temperatureTrend: this.analyzeTemperatureTrend(forecast),
      precipitationRisk: this.analyzePrecipitationRisk(currentWeather, forecast),
      comfortIndex: this.calculateComfortIndex(currentWeather),
      weatherStability: this.calculateWeatherStability(forecast),
      timeOfDay: this.getTimeOfDayContext(),
    };

    // Store for historical learning
    this.storeWeatherPattern(analysis);

    return analysis;
  }

  /**
   * Analyze current weather conditions with detailed metrics
   */
  analyzeCurrentConditions(weather) {
    const temp = weather.current.temperature;
    const condition = (weather.current.condition || '').toLowerCase();

    return {
      temperature: temp,
      feelsLike: this.calculateFeelsLike(temp, weather.current),
      tempCategory: this.categorizeTemperature(temp),
      condition: condition,
      isRainy: condition.includes('rain') || condition.includes('drizzle'),
      isSnowy: condition.includes('snow'),
      isCloudy: condition.includes('cloud'),
      isSunny: condition.includes('clear') || condition.includes('sun'),
      humidity: weather.current.humidity || 50,
      windSpeed: weather.current.wind?.speed || 0,
    };
  }

  /**
   * Analyze temperature trends from forecast data
   */
  analyzeTemperatureTrend(forecast) {
    if (!forecast || forecast.length < 2) {
      return { trend: 'stable', change: 0, volatility: 'low' };
    }

    const temps = forecast.map(f => f.temp);
    const changes = [];

    for (let i = 1; i < temps.length; i++) {
      changes.push(temps[i] - temps[i - 1]);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const volatility = this.calculateVolatility(changes);

    return {
      trend: avgChange > 2 ? 'warming' : avgChange < -2 ? 'cooling' : 'stable',
      change: avgChange,
      volatility: volatility > 5 ? 'high' : volatility > 2 ? 'medium' : 'low',
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...temps),
      range: Math.max(...temps) - Math.min(...temps),
    };
  }

  /**
   * Analyze precipitation risk based on current and forecast data
   */
  analyzePrecipitationRisk(currentWeather, forecast) {
    const currentCondition = (currentWeather.current.condition || '').toLowerCase();
    const isCurrentlyRainy = currentCondition.includes('rain') ||
                            currentCondition.includes('drizzle') ||
                            currentCondition.includes('snow');

    const forecastRainCount = forecast.filter(f => {
      const cond = (f.condition || '').toLowerCase();
      return cond.includes('rain') || cond.includes('drizzle') || cond.includes('snow');
    }).length;

    const riskScore = (isCurrentlyRainy ? 0.5 : 0) +
                     (forecastRainCount / forecast.length * 0.5);

    return {
      level: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
      score: riskScore,
      isCurrentlyRainy,
      forecastRainProbability: forecastRainCount / forecast.length,
      type: currentCondition.includes('snow') ? 'snow' :
            currentCondition.includes('rain') ? 'rain' : 'none',
    };
  }

  /**
   * Calculate comfort index based on temperature, humidity, and wind
   */
  calculateComfortIndex(weather) {
    const temp = weather.current.temperature;
    const humidity = weather.current.humidity || 50;
    const windSpeed = weather.current.wind?.speed || 0;

    // Heat index calculation (simplified)
    let comfortScore = 50;

    if (temp < 10) comfortScore -= (10 - temp) * 2;
    else if (temp > 28) comfortScore -= (temp - 28) * 2;

    if (humidity > 70) comfortScore -= (humidity - 70) * 0.5;
    if (windSpeed > 20) comfortScore -= (windSpeed - 20) * 0.3;

    return {
      score: Math.max(0, Math.min(100, comfortScore)),
      level: comfortScore > 70 ? 'comfortable' :
             comfortScore > 40 ? 'moderate' : 'uncomfortable',
      factors: {
        temperature: temp > 18 && temp < 26 ? 'ideal' : 'suboptimal',
        humidity: humidity > 30 && humidity < 60 ? 'ideal' : 'suboptimal',
        wind: windSpeed < 15 ? 'calm' : 'breezy',
      },
    };
  }

  /**
   * Calculate weather stability from forecast
   */
  calculateWeatherStability(forecast) {
    if (!forecast || forecast.length < 2) return { stable: true, score: 1 };

    const conditions = forecast.map(f => f.condition);
    const uniqueConditions = new Set(conditions).size;
    const stabilityScore = 1 - (uniqueConditions / conditions.length);

    return {
      stable: stabilityScore > 0.6,
      score: stabilityScore,
      level: stabilityScore > 0.7 ? 'very stable' :
             stabilityScore > 0.4 ? 'moderately stable' : 'unstable',
    };
  }

  /**
   * Get time of day context for recommendations
   */
  getTimeOfDayContext() {
    const hour = new Date().getHours();

    return {
      hour,
      period: hour < 6 ? 'night' :
              hour < 12 ? 'morning' :
              hour < 17 ? 'afternoon' :
              hour < 21 ? 'evening' : 'night',
      isWorkHours: hour >= 9 && hour < 17,
      needsAllDayGear: hour < 10, // Early enough to plan for whole day
    };
  }

  /**
   * Calculate "feels like" temperature
   */
  calculateFeelsLike(temp, current) {
    const windSpeed = current.wind?.speed || 0;
    const humidity = current.humidity || 50;

    // Wind chill for cold weather
    if (temp < 10 && windSpeed > 5) {
      return temp - (windSpeed * 0.5);
    }

    // Heat index for hot weather
    if (temp > 27 && humidity > 40) {
      return temp + ((humidity - 40) * 0.1);
    }

    return temp;
  }

  /**
   * Categorize temperature into ranges
   */
  categorizeTemperature(temp) {
    if (temp < 0) return 'freezing';
    if (temp < 5) return 'very_cold';
    if (temp < 10) return 'cold';
    if (temp < 15) return 'cool';
    if (temp < 20) return 'mild';
    if (temp < 25) return 'warm';
    if (temp < 30) return 'hot';
    return 'very_hot';
  }

  /**
   * Calculate volatility (standard deviation)
   */
  calculateVolatility(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Store weather pattern for historical analysis
   */
  storeWeatherPattern(analysis) {
    this.historicalData.push({
      timestamp: Date.now(),
      ...analysis,
    });

    // Keep only last 100 entries
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }

    this.saveHistoricalData();
  }

  /**
   * Load historical data from localStorage
   */
  loadHistoricalData() {
    try {
      const data = localStorage.getItem('weather_historical_data');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading historical data:', error);
      return [];
    }
  }

  /**
   * Save historical data to localStorage
   */
  saveHistoricalData() {
    try {
      localStorage.setItem('weather_historical_data', JSON.stringify(this.historicalData));
    } catch (error) {
      console.error('Error saving historical data:', error);
    }
  }

  /**
   * Get seasonal patterns from historical data
   */
  getSeasonalPatterns() {
    const month = new Date().getMonth();
    const season = Math.floor(month / 3); // 0=winter, 1=spring, 2=summer, 3=fall

    const seasonalData = this.historicalData.filter(entry => {
      const entryMonth = new Date(entry.timestamp).getMonth();
      return Math.floor(entryMonth / 3) === season;
    });

    if (seasonalData.length < 5) {
      return null; // Not enough data
    }

    const avgTemp = seasonalData.reduce((sum, entry) =>
      sum + entry.currentConditions.temperature, 0) / seasonalData.length;

    const rainFrequency = seasonalData.filter(entry =>
      entry.precipitationRisk.isCurrentlyRainy).length / seasonalData.length;

    return {
      season: ['winter', 'spring', 'summer', 'fall'][season],
      avgTemperature: avgTemp,
      rainFrequency,
      dataPoints: seasonalData.length,
    };
  }
}
