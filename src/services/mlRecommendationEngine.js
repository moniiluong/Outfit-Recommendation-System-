/**
 * ML-Based Recommendation Engine
 * Uses neural network-like algorithms to learn user preferences
 * and generate personalized outfit recommendations
 */

export class MLRecommendationEngine {
  constructor() {
    this.clothingDatabase = this.initializeClothingDatabase();
    this.userProfile = this.loadUserProfile();
    this.recommendations = [];
    this.modelWeights = this.loadModelWeights();
  }

  /**
   * Generate personalized outfit recommendations using ML
   */
  generateRecommendations(weatherAnalysis, userContext = {}) {
    const features = this.extractFeatures(weatherAnalysis, userContext);
    const baseRecommendations = this.getBaseRecommendations(features);

    // Apply ML personalization
    const personalizedRecs = this.personalizeRecommendations(
      baseRecommendations,
      features,
      this.userProfile
    );

    // Rank and score recommendations
    const rankedRecs = this.rankRecommendations(personalizedRecs, features);

    // Add reasoning and confidence
    const enrichedRecs = rankedRecs.map(rec => ({
      ...rec,
      reasoning: this.generateReasoning(rec, weatherAnalysis),
      confidence: this.calculateConfidence(rec, features),
    }));

    this.recommendations = enrichedRecs;
    return enrichedRecs;
  }

  /**
   * Extract features from weather analysis for ML processing
   */
  extractFeatures(weatherAnalysis, userContext) {
    const { currentConditions, temperatureTrend, precipitationRisk, comfortIndex, timeOfDay } = weatherAnalysis;

    return {
      // Temperature features
      temperature: this.normalizeTemperature(currentConditions.temperature),
      feelsLike: this.normalizeTemperature(currentConditions.feelsLike),
      tempCategory: this.encodeTempCategory(currentConditions.tempCategory),
      tempTrend: this.encodeTrend(temperatureTrend.trend),
      tempVolatility: this.encodeVolatility(temperatureTrend.volatility),

      // Weather condition features
      isRainy: currentConditions.isRainy ? 1 : 0,
      isSnowy: currentConditions.isSnowy ? 1 : 0,
      isSunny: currentConditions.isSunny ? 1 : 0,
      isCloudy: currentConditions.isCloudy ? 1 : 0,

      // Precipitation features
      precipRisk: precipitationRisk.score,
      precipLevel: this.encodePrecipLevel(precipitationRisk.level),

      // Comfort features
      comfortScore: comfortIndex.score / 100,
      humidity: (currentConditions.humidity || 50) / 100,
      windSpeed: Math.min(currentConditions.windSpeed / 50, 1),

      // Time context
      timeOfDay: this.encodeTimeOfDay(timeOfDay.period),
      isWorkHours: timeOfDay.isWorkHours ? 1 : 0,
      needsAllDayGear: timeOfDay.needsAllDayGear ? 1 : 0,

      // User context
      activityLevel: userContext.activityLevel || 0.5,
      stylePreference: userContext.stylePreference || 0.5,
    };
  }

  /**
   * Get base recommendations using rule-based + ML hybrid approach
   */
  getBaseRecommendations(features) {
    const recommendations = [];
    const temp = features.temperature * 40 - 10; // Denormalize

    // Layer system based on temperature
    if (temp < 0 || features.isSnowy) {
      recommendations.push(
        { category: 'outerwear', item: 'Heavy winter coat', priority: 1, layerIndex: 3 },
        { category: 'head', item: 'Winter hat', priority: 1, layerIndex: 3 },
        { category: 'hands', item: 'Insulated gloves', priority: 1, layerIndex: 3 },
        { category: 'bottom', item: 'Thermal underwear', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Warm pants', priority: 1, layerIndex: 2 },
        { category: 'feet', item: 'Winter boots', priority: 1, layerIndex: 3 }
      );
    } else if (temp < 5) {
      recommendations.push(
        { category: 'outerwear', item: 'Heavy coat', priority: 1, layerIndex: 3 },
        { category: 'top', item: 'Warm sweater', priority: 1, layerIndex: 2 },
        { category: 'bottom', item: 'Long pants', priority: 1, layerIndex: 2 },
        { category: 'head', item: 'Beanie', priority: 0.8, layerIndex: 3 },
        { category: 'accessories', item: 'Scarf', priority: 0.8, layerIndex: 3 }
      );
    } else if (temp < 10) {
      recommendations.push(
        { category: 'outerwear', item: 'Warm jacket', priority: 1, layerIndex: 3 },
        { category: 'top', item: 'Long sleeve shirt', priority: 1, layerIndex: 1 },
        { category: 'top', item: 'Sweater or cardigan', priority: 0.8, layerIndex: 2 },
        { category: 'bottom', item: 'Jeans or pants', priority: 1, layerIndex: 2 }
      );
    } else if (temp < 15) {
      recommendations.push(
        { category: 'outerwear', item: 'Light jacket', priority: 0.9, layerIndex: 2 },
        { category: 'top', item: 'Long sleeve shirt', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Jeans', priority: 1, layerIndex: 2 }
      );
    } else if (temp < 20) {
      recommendations.push(
        { category: 'top', item: 'Light sweater or cardigan', priority: 0.7, layerIndex: 2 },
        { category: 'top', item: 'T-shirt or blouse', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Comfortable pants', priority: 1, layerIndex: 2 }
      );
    } else if (temp < 25) {
      recommendations.push(
        { category: 'top', item: 'T-shirt', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Light pants or jeans', priority: 1, layerIndex: 2 }
      );
    } else if (temp < 30) {
      recommendations.push(
        { category: 'top', item: 'Light breathable shirt', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Shorts or light pants', priority: 1, layerIndex: 1 },
        { category: 'accessories', item: 'Sunglasses', priority: 0.8, layerIndex: 1 }
      );
    } else {
      recommendations.push(
        { category: 'top', item: 'Tank top or light shirt', priority: 1, layerIndex: 1 },
        { category: 'bottom', item: 'Shorts', priority: 1, layerIndex: 1 },
        { category: 'accessories', item: 'Sunglasses', priority: 1, layerIndex: 1 },
        { category: 'head', item: 'Sun hat', priority: 0.9, layerIndex: 1 }
      );
    }

    // Weather-specific additions
    if (features.isRainy || features.precipRisk > 0.4) {
      recommendations.push(
        { category: 'outerwear', item: 'Waterproof jacket', priority: 1, layerIndex: 3 },
        { category: 'accessories', item: 'Umbrella', priority: 1, layerIndex: 0 },
        { category: 'feet', item: 'Waterproof shoes', priority: 0.9, layerIndex: 2 }
      );
    }

    if (features.isSunny && temp > 20) {
      recommendations.push(
        { category: 'accessories', item: 'Sunscreen', priority: 0.7, layerIndex: 0 }
      );
    }

    if (features.windSpeed > 0.4) {
      recommendations.push(
        { category: 'outerwear', item: 'Windbreaker', priority: 0.8, layerIndex: 2 }
      );
    }

    return recommendations;
  }

  /**
   * Personalize recommendations based on user profile and ML weights
   */
  personalizeRecommendations(baseRecs, features, userProfile) {
    return baseRecs.map(rec => {
      let adjustedPriority = rec.priority;

      // Apply user preference weights
      const categoryPreference = userProfile.categoryPreferences?.[rec.category] || 1;
      const itemPreference = userProfile.itemPreferences?.[rec.item] || 1;

      // ML weight adjustment
      const featureKey = this.getFeatureKey(rec, features);
      const mlWeight = this.modelWeights[featureKey] || 1;

      // Combine weights using neural network-like activation
      adjustedPriority = this.sigmoid(
        rec.priority * 0.4 +
        categoryPreference * 0.3 +
        itemPreference * 0.2 +
        mlWeight * 0.1
      );

      return {
        ...rec,
        originalPriority: rec.priority,
        adjustedPriority,
        personalizationScore: itemPreference,
      };
    });
  }

  /**
   * Rank recommendations by adjusted priority and relevance
   */
  rankRecommendations(recommendations, features) {
    // Group by category to ensure diversity
    const grouped = recommendations.reduce((acc, rec) => {
      if (!acc[rec.category]) acc[rec.category] = [];
      acc[rec.category].push(rec);
      return acc;
    }, {});

    // Sort within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => b.adjustedPriority - a.adjustedPriority);
    });

    // Select top items from each category
    const selected = [];
    const categoryOrder = ['outerwear', 'top', 'bottom', 'feet', 'head', 'hands', 'accessories'];

    categoryOrder.forEach(category => {
      if (grouped[category]) {
        // Take top 2 items from each category
        selected.push(...grouped[category].slice(0, 2).filter(r => r.adjustedPriority > 0.3));
      }
    });

    // Add any remaining high-priority items
    Object.values(grouped).forEach(items => {
      items.forEach(item => {
        if (!selected.includes(item) && item.adjustedPriority > 0.7) {
          selected.push(item);
        }
      });
    });

    return selected;
  }

  /**
   * Calculate confidence score for each recommendation
   */
  calculateConfidence(recommendation, features) {
    let confidence = recommendation.adjustedPriority;

    // Boost confidence for weather-critical items
    if ((features.isRainy && recommendation.item.toLowerCase().includes('waterproof')) ||
        (features.isSnowy && recommendation.item.toLowerCase().includes('winter'))) {
      confidence = Math.min(1, confidence * 1.2);
    }

    // Reduce confidence for edge cases
    if (features.tempVolatility > 0.7) {
      confidence *= 0.9;
    }

    return Math.round(confidence * 100);
  }

  /**
   * Generate human-readable reasoning for recommendation
   */
  generateReasoning(recommendation, weatherAnalysis) {
    const reasons = [];
    const { currentConditions, temperatureTrend, precipitationRisk, comfortIndex } = weatherAnalysis;

    // Temperature-based reasoning
    if (currentConditions.tempCategory === 'freezing' || currentConditions.tempCategory === 'very_cold') {
      reasons.push(`Temperature is ${currentConditions.temperature}°C - very cold protection needed`);
    } else if (currentConditions.tempCategory === 'very_hot') {
      reasons.push(`Temperature is ${currentConditions.temperature}°C - light, breathable clothing recommended`);
    }

    // Weather condition reasoning
    if (precipitationRisk.isCurrentlyRainy) {
      reasons.push('Rain expected - waterproof protection essential');
    } else if (precipitationRisk.score > 0.4) {
      reasons.push(`${Math.round(precipitationRisk.score * 100)}% chance of precipitation later`);
    }

    if (currentConditions.isSunny && currentConditions.temperature > 20) {
      reasons.push('Sunny weather - sun protection recommended');
    }

    // Trend reasoning
    if (temperatureTrend.trend === 'warming') {
      reasons.push('Temperature rising - consider layering options');
    } else if (temperatureTrend.trend === 'cooling') {
      reasons.push('Temperature dropping - bring warmer layers');
    }

    // Comfort reasoning
    if (comfortIndex.level === 'uncomfortable') {
      reasons.push('Uncomfortable conditions - extra protection advisable');
    }

    if (reasons.length === 0) {
      reasons.push('Optimal for current weather conditions');
    }

    return reasons.join(' • ');
  }

  /**
   * Sigmoid activation function (neural network-like)
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Get feature key for ML weight lookup
   */
  getFeatureKey(recommendation, features) {
    return `${recommendation.category}_${Math.floor(features.temperature * 10)}_${features.isRainy}`;
  }

  // Encoding functions for feature normalization
  normalizeTemperature(temp) {
    return (temp + 10) / 50; // Normalize -10 to 40°C to 0-1
  }

  encodeTempCategory(category) {
    const categories = ['freezing', 'very_cold', 'cold', 'cool', 'mild', 'warm', 'hot', 'very_hot'];
    return categories.indexOf(category) / categories.length;
  }

  encodeTrend(trend) {
    return trend === 'warming' ? 1 : trend === 'cooling' ? -1 : 0;
  }

  encodeVolatility(volatility) {
    return volatility === 'high' ? 1 : volatility === 'medium' ? 0.5 : 0;
  }

  encodePrecipLevel(level) {
    return level === 'high' ? 1 : level === 'medium' ? 0.5 : 0;
  }

  encodeTimeOfDay(period) {
    const periods = { night: 0, morning: 0.33, afternoon: 0.66, evening: 1 };
    return periods[period] || 0.5;
  }

  /**
   * Initialize clothing database
   */
  initializeClothingDatabase() {
    return {
      outerwear: ['Heavy winter coat', 'Heavy coat', 'Warm jacket', 'Light jacket', 'Windbreaker', 'Waterproof jacket'],
      top: ['Tank top', 'T-shirt', 'Long sleeve shirt', 'Sweater', 'Cardigan', 'Thermal underwear'],
      bottom: ['Shorts', 'Light pants', 'Jeans', 'Warm pants', 'Thermal underwear'],
      feet: ['Sandals', 'Sneakers', 'Waterproof shoes', 'Boots', 'Winter boots'],
      head: ['Sun hat', 'Cap', 'Beanie', 'Winter hat'],
      hands: ['Light gloves', 'Insulated gloves'],
      accessories: ['Sunglasses', 'Umbrella', 'Scarf', 'Sunscreen'],
    };
  }

  /**
   * Load user profile from localStorage
   */
  loadUserProfile() {
    try {
      const profile = localStorage.getItem('user_outfit_profile');
      return profile ? JSON.parse(profile) : {
        categoryPreferences: {},
        itemPreferences: {},
        feedbackHistory: [],
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return { categoryPreferences: {}, itemPreferences: {}, feedbackHistory: [] };
    }
  }

  /**
   * Load ML model weights from localStorage
   */
  loadModelWeights() {
    try {
      const weights = localStorage.getItem('ml_model_weights');
      return weights ? JSON.parse(weights) : {};
    } catch (error) {
      console.error('Error loading model weights:', error);
      return {};
    }
  }

  /**
   * Save ML model weights
   */
  saveModelWeights() {
    try {
      localStorage.setItem('ml_model_weights', JSON.stringify(this.modelWeights));
    } catch (error) {
      console.error('Error saving model weights:', error);
    }
  }

  /**
   * Save user profile
   */
  saveUserProfile() {
    try {
      localStorage.setItem('user_outfit_profile', JSON.stringify(this.userProfile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }
}
