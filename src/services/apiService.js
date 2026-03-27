/**
 * API Service for communicating with Python backend
 * Handles all HTTP requests to the FastAPI backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userId = this.getUserId();
  }

  /**
   * Get or create a unique user ID
   */
  getUserId() {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', userId);
    }
    return userId;
  }

  /**
   * Fetch weather data from backend
   */
  async fetchWeather(lat, lon) {
    try {
      const response = await fetch(`${this.baseUrl}/api/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat,
          lon,
          user_id: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }

  /**
   * Get outfit recommendations from backend
   */
  async getRecommendations(currentWeather, forecast, userContext = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_weather: currentWeather,
          forecast,
          user_context: userContext,
          user_id: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Recommendations API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Record user feedback on a recommendation
   */
  async recordFeedback(recommendation, feedback, weatherContext) {
    try {
      const response = await fetch(`${this.baseUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
          recommendation,
          feedback,
          weather_context: weatherContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Feedback API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording feedback:', error);
      throw error;
    }
  }

  /**
   * Get personalized insights for the user
   */
  async getUserInsights() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Insights API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting insights:', error);
      throw error;
    }
  }

  /**
   * Export user data
   */
  async exportUserData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Clear all user data
   */
  async clearUserData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Clear data API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      if (!response.ok) {
        throw new Error('Backend is not responding');
      }
      return await response.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw error;
    }
  }
}

export default new APIService();
