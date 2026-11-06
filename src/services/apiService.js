/**
 * API Service for communicating with Python backend
 * Handles all HTTP requests to the FastAPI backend
 */

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return `${process.env.REACT_APP_API_URL.replace(/\/$/, '').replace(
      /\/api$/,
      ''
    )}/api`;
  }

  if (
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  ) {
    return 'http://localhost:8000/api';
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
      const message = data.detail || data.message;
      detail = typeof message === 'string' ? message : '';
    } catch (error) {
      detail = '';
    }

    throw new Error(detail || `${fallbackMessage}: ${response.status}`);
  }

  /**
   * Get or create a unique user ID
   */
  getUserId() {
    let userId;
    try {
      userId = localStorage.getItem('user_id');
    } catch {
      /* Continue without persistent browser storage. */
    }
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        localStorage.setItem('user_id', userId);
      } catch {
        /* Session ID still works. */
      }
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
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          lat,
          lon,
          user_id: this.userId,
        }),
      });

      return await this.parseResponse(response, 'Weather API error');
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('The weather request timed out. Please try again.');
      }
      if (error instanceof TypeError) {
        throw new Error(
          'Could not reach the weather server. Please try again later.'
        );
      }
      throw error;
    }
  }

  async prepareGarment(payload, signal) {
    try {
      const response = await fetch(`${this.baseUrl}/clothing/cutout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
      const cutout = await this.parseResponse(
        response,
        'The clothing cutout could not be prepared'
      );
      if (
        !cutout.image?.startsWith('data:image/png;base64,') ||
        !Number.isFinite(cutout.width) ||
        cutout.width <= 0 ||
        !Number.isFinite(cutout.height) ||
        cutout.height <= 0
      ) {
        throw new Error('The server did not return a usable clothing cutout.');
      }
      return cutout;
    } catch (error) {
      if (error instanceof TypeError)
        throw new Error(
          'Could not reach the photo cleanup server. You can keep the original photo or try again later.'
        );
      throw error;
    }
  }
}

const apiService = new APIService();

export default apiService;
