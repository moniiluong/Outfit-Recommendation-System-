/**
 * User Preference Learning System
 * Implements a feedback loop to continuously learn and adapt to user preferences
 * Uses reinforcement learning principles to improve recommendations over time
 */

export class UserPreferenceLearning {
  constructor(mlEngine) {
    this.mlEngine = mlEngine;
    this.learningRate = 0.1;
    this.feedbackHistory = this.loadFeedbackHistory();
    this.sessionData = [];
  }

  /**
   * Record user feedback on a recommendation
   * @param {Object} recommendation - The recommendation that was shown
   * @param {string} feedback - 'like', 'dislike', 'worn', 'ignored'
   * @param {Object} weatherContext - Weather conditions when feedback was given
   */
  recordFeedback(recommendation, feedback, weatherContext) {
    const feedbackEntry = {
      timestamp: Date.now(),
      recommendation: {
        item: recommendation.item,
        category: recommendation.category,
        confidence: recommendation.confidence,
      },
      feedback,
      weatherContext: {
        temperature: weatherContext.temperature,
        condition: weatherContext.condition,
        timeOfDay: weatherContext.timeOfDay,
      },
      sessionId: this.getCurrentSessionId(),
    };

    this.feedbackHistory.push(feedbackEntry);
    this.sessionData.push(feedbackEntry);

    // Update ML weights based on feedback
    this.updateModelWeights(feedbackEntry);

    // Update user profile
    this.updateUserProfile(feedbackEntry);

    // Save to storage
    this.saveFeedbackHistory();
    this.mlEngine.saveModelWeights();
    this.mlEngine.saveUserProfile();

    return feedbackEntry;
  }

  /**
   * Update ML model weights using reinforcement learning
   */
  updateModelWeights(feedbackEntry) {
    const { recommendation, feedback, weatherContext } = feedbackEntry;

    // Calculate reward signal
    const reward = this.calculateReward(feedback);

    // Extract features
    const features = {
      temperature: this.normalizeTemperature(weatherContext.temperature),
      isRainy: weatherContext.condition?.toLowerCase().includes('rain') ? 1 : 0,
    };

    // Update weight for this specific recommendation pattern
    const featureKey = `${recommendation.category}_${Math.floor(features.temperature * 10)}_${features.isRainy}`;
    const currentWeight = this.mlEngine.modelWeights[featureKey] || 1;

    // Gradient descent update
    const newWeight = currentWeight + this.learningRate * reward;
    this.mlEngine.modelWeights[featureKey] = Math.max(0, Math.min(2, newWeight)); // Clamp between 0 and 2

    // Also update related patterns (generalization)
    this.updateRelatedWeights(featureKey, reward * 0.5);
  }

  /**
   * Calculate reward signal from user feedback
   */
  calculateReward(feedback) {
    switch (feedback) {
      case 'worn':
        return 1.0; // Strongest positive signal
      case 'like':
        return 0.5;
      case 'ignored':
        return -0.2; // Mild negative signal
      case 'dislike':
        return -0.5;
      case 'inappropriate':
        return -1.0; // Strongest negative signal
      default:
        return 0;
    }
  }

  /**
   * Update related weights for generalization
   */
  updateRelatedWeights(featureKey, adjustedReward) {
    const [category, tempBucket, isRainy] = featureKey.split('_');

    // Update adjacent temperature buckets
    const tempNum = parseInt(tempBucket);
    for (let offset = -1; offset <= 1; offset++) {
      if (offset === 0) continue;

      const relatedKey = `${category}_${tempNum + offset}_${isRainy}`;
      const currentWeight = this.mlEngine.modelWeights[relatedKey] || 1;
      const decay = Math.abs(offset) === 1 ? 0.5 : 0.25;

      this.mlEngine.modelWeights[relatedKey] = Math.max(
        0,
        Math.min(2, currentWeight + this.learningRate * adjustedReward * decay)
      );
    }
  }

  /**
   * Update user profile with preference learning
   */
  updateUserProfile(feedbackEntry) {
    const { recommendation, feedback } = feedbackEntry;
    const profile = this.mlEngine.userProfile;

    // Update category preferences
    if (!profile.categoryPreferences) profile.categoryPreferences = {};
    const categoryPref = profile.categoryPreferences[recommendation.category] || 1;

    const categoryReward = this.calculateReward(feedback) * 0.5;
    profile.categoryPreferences[recommendation.category] = Math.max(
      0,
      Math.min(2, categoryPref + this.learningRate * categoryReward)
    );

    // Update item preferences
    if (!profile.itemPreferences) profile.itemPreferences = {};
    const itemPref = profile.itemPreferences[recommendation.item] || 1;

    const itemReward = this.calculateReward(feedback);
    profile.itemPreferences[recommendation.item] = Math.max(
      0,
      Math.min(2, itemPref + this.learningRate * itemReward)
    );

    // Store feedback in profile
    if (!profile.feedbackHistory) profile.feedbackHistory = [];
    profile.feedbackHistory.push({
      timestamp: feedbackEntry.timestamp,
      item: recommendation.item,
      feedback,
    });

    // Keep only last 200 feedback entries
    if (profile.feedbackHistory.length > 200) {
      profile.feedbackHistory = profile.feedbackHistory.slice(-200);
    }
  }

  /**
   * Get personalized insights based on learning
   */
  getPersonalizedInsights() {
    if (this.feedbackHistory.length < 10) {
      return {
        dataPoints: this.feedbackHistory.length,
        message: 'Keep providing feedback to get personalized insights!',
        insights: [],
      };
    }

    const insights = [];
    const profile = this.mlEngine.userProfile;

    // Analyze category preferences
    const categoryPrefs = profile.categoryPreferences || {};
    const topCategories = Object.entries(categoryPrefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topCategories.length > 0) {
      insights.push({
        type: 'preference',
        title: 'Your Favorite Categories',
        description: topCategories
          .map(([cat, score]) => `${cat} (${Math.round(score * 50)}% preference)`)
          .join(', '),
      });
    }

    // Analyze item preferences
    const itemPrefs = profile.itemPreferences || {};
    const lovedItems = Object.entries(itemPrefs)
      .filter(([, score]) => score > 1.3)
      .map(([item]) => item);

    if (lovedItems.length > 0) {
      insights.push({
        type: 'loved',
        title: 'Items You Love',
        description: lovedItems.slice(0, 5).join(', '),
      });
    }

    const dislikedItems = Object.entries(itemPrefs)
      .filter(([, score]) => score < 0.7)
      .map(([item]) => item);

    if (dislikedItems.length > 0) {
      insights.push({
        type: 'disliked',
        title: 'Items You Avoid',
        description: dislikedItems.slice(0, 5).join(', '),
      });
    }

    // Analyze weather patterns
    const weatherPatterns = this.analyzeWeatherPatterns();
    if (weatherPatterns) {
      insights.push(weatherPatterns);
    }

    return {
      dataPoints: this.feedbackHistory.length,
      message: `We've learned from ${this.feedbackHistory.length} of your feedback entries!`,
      insights,
      learningProgress: this.calculateLearningProgress(),
    };
  }

  /**
   * Analyze user's weather-based patterns
   */
  analyzeWeatherPatterns() {
    const recentFeedback = this.feedbackHistory.slice(-50);

    const coldWeatherFeedback = recentFeedback.filter(
      f => f.weatherContext.temperature < 10
    );

    const warmWeatherFeedback = recentFeedback.filter(
      f => f.weatherContext.temperature > 20
    );

    if (coldWeatherFeedback.length > 5) {
      const coldLikes = coldWeatherFeedback.filter(
        f => f.feedback === 'like' || f.feedback === 'worn'
      ).length;

      const coldPreference = coldLikes / coldWeatherFeedback.length;

      if (coldPreference > 0.7) {
        return {
          type: 'weather_pattern',
          title: 'Cold Weather Preference',
          description: 'You seem to appreciate our cold weather recommendations!',
        };
      }
    }

    if (warmWeatherFeedback.length > 5) {
      const warmLikes = warmWeatherFeedback.filter(
        f => f.feedback === 'like' || f.feedback === 'worn'
      ).length;

      const warmPreference = warmLikes / warmWeatherFeedback.length;

      if (warmPreference > 0.7) {
        return {
          type: 'weather_pattern',
          title: 'Warm Weather Preference',
          description: 'You love our warm weather recommendations!',
        };
      }
    }

    return null;
  }

  /**
   * Calculate overall learning progress
   */
  calculateLearningProgress() {
    const totalFeedback = this.feedbackHistory.length;

    if (totalFeedback < 10) return { level: 'beginner', percentage: 10 };
    if (totalFeedback < 30) return { level: 'learning', percentage: 30 };
    if (totalFeedback < 50) return { level: 'intermediate', percentage: 50 };
    if (totalFeedback < 100) return { level: 'advanced', percentage: 70 };
    return { level: 'expert', percentage: 90 };
  }

  /**
   * Get session-based analytics
   */
  getSessionAnalytics() {
    const totalRecommendations = this.sessionData.length;

    if (totalRecommendations === 0) {
      return null;
    }

    const liked = this.sessionData.filter(
      f => f.feedback === 'like' || f.feedback === 'worn'
    ).length;

    const disliked = this.sessionData.filter(
      f => f.feedback === 'dislike' || f.feedback === 'inappropriate'
    ).length;

    return {
      totalRecommendations,
      liked,
      disliked,
      ignored: totalRecommendations - liked - disliked,
      satisfactionRate: liked / totalRecommendations,
    };
  }

  /**
   * Reset session data (call when app restarts)
   */
  resetSession() {
    this.sessionData = [];
  }

  /**
   * Export user data for analysis or backup
   */
  exportUserData() {
    return {
      feedbackHistory: this.feedbackHistory,
      userProfile: this.mlEngine.userProfile,
      modelWeights: this.mlEngine.modelWeights,
      exportDate: new Date().toISOString(),
      dataPoints: this.feedbackHistory.length,
    };
  }

  /**
   * Import user data (for restore or migration)
   */
  importUserData(data) {
    if (data.feedbackHistory) {
      this.feedbackHistory = data.feedbackHistory;
      this.saveFeedbackHistory();
    }

    if (data.userProfile) {
      this.mlEngine.userProfile = data.userProfile;
      this.mlEngine.saveUserProfile();
    }

    if (data.modelWeights) {
      this.mlEngine.modelWeights = data.modelWeights;
      this.mlEngine.saveModelWeights();
    }

    return {
      success: true,
      dataPoints: this.feedbackHistory.length,
    };
  }

  /**
   * Clear all learning data (reset to defaults)
   */
  clearAllData() {
    this.feedbackHistory = [];
    this.sessionData = [];
    this.mlEngine.userProfile = {
      categoryPreferences: {},
      itemPreferences: {},
      feedbackHistory: [],
    };
    this.mlEngine.modelWeights = {};

    this.saveFeedbackHistory();
    this.mlEngine.saveUserProfile();
    this.mlEngine.saveModelWeights();

    return { success: true, message: 'All learning data cleared' };
  }

  // Helper functions
  getCurrentSessionId() {
    if (!this._sessionId) {
      this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._sessionId;
  }

  normalizeTemperature(temp) {
    return (temp + 10) / 50;
  }

  loadFeedbackHistory() {
    try {
      const history = localStorage.getItem('user_feedback_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading feedback history:', error);
      return [];
    }
  }

  saveFeedbackHistory() {
    try {
      localStorage.setItem('user_feedback_history', JSON.stringify(this.feedbackHistory));
    } catch (error) {
      console.error('Error saving feedback history:', error);
    }
  }
}
