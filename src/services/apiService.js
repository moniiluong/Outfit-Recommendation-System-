/**
 * API Service for communicating with Python backend
 * Handles all HTTP requests to the FastAPI backend
 */

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }

  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

class APIService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userId = this.getUserId();
  }

  async parseResponse(response, fallbackMessage) {
    if (response.ok) {
      return response.json();
    }

    let detail = '';
    try {
      const data = await response.json();
      detail = data.detail || data.message || '';
    } catch (error) {
      detail = '';
    }

    throw new Error(detail || `${fallbackMessage}: ${response.status}`);
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
      const response = await fetch(`${this.baseUrl}/weather`, {
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

      return await this.parseResponse(response, 'Weather API error');
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
      const response = await fetch(`${this.baseUrl}/recommendations`, {
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

      return await this.parseResponse(response, 'Recommendations API error');
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
      const response = await fetch(`${this.baseUrl}/feedback`, {
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

      return await this.parseResponse(response, 'Feedback API error');
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
      const response = await fetch(`${this.baseUrl}/user/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      return await this.parseResponse(response, 'Insights API error');
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
      const response = await fetch(`${this.baseUrl}/user/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      return await this.parseResponse(response, 'Export API error');
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
      const response = await fetch(`${this.baseUrl}/user/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
        }),
      });

      return await this.parseResponse(response, 'Clear data API error');
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
      return await this.parseResponse(response, 'Backend is not responding');
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw error;
    }
  }
}

const apiService = new APIService();

export default apiService;
