// src/App.js
// Outfit Recommendation System with Python backend
import React, { useState, useEffect, useCallback } from 'react';
import './style.css';
import WeatherHeader from './components/WeatherHeader';
import Avatar from './components/Avatar';
import Recommendations from './components/Recommendations';
import Forecast from './components/Forecast';
import AvatarCustomizationModal from './components/AvatarCustomizationModal';
import apiService from './services/apiService';
import { AvatarOutfitMapper } from './services/avatarOutfitMapper';
import { suggestClothing, getAvatarOutfit } from './utils/clothingRecommendations';
import { convertTemperature } from './utils/weatherUtils';

function App() {
  // Weather state
  const [weather, setWeather] = useState(null);

  // Temperature Conversion Function
  const [tempUnit, setTempUnit] = useState('C');

  // Simple UI state for messages/errors
  const [status, setStatus] = useState('init'); // 'init' | 'locating' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  // ML-enhanced recommendations
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [weatherAnalysis, setWeatherAnalysis] = useState(null);

  // Avatar base config - load from localStorage or use defaults
  const [avatarBase, setAvatarBase] = useState(() => {
    try {
      const saved = localStorage.getItem('avatar_customization');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading avatar customization:', error);
    }
    return {
      skin: 'tanned',
      eyes: 'default',
      eyebrows: 'defaultNatural',
      mouth: 'smile',
      top: 'shortWaved',
      hairColor: 'brown',
      facialHair: 'none',
      accessories: 'none',
    };
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    apiService.healthCheck()
      .then(response => {
        console.log('Backend connected:', response);
      })
      .catch(error => {
        console.warn('Backend not available, some features may be limited:', error);
      });
  }, []);

  // Fetch weather for given coords
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      setStatus('locating');

      // Call Python backend for weather data
      const weatherData = await apiService.fetchWeather(lat, lon);

      // Process forecast into daily buckets (same as before)
      const forecast = [];
      if (weatherData.forecast && weatherData.forecast.length > 0) {
        const daily = {};
        weatherData.forecast.forEach(item => {
          const date = new Date(item.dt * 1000);
          const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
          if (!daily[key]) daily[key] = { temps: [], conditions: {} };
          daily[key].temps.push(item.temp);
          const cond = item.condition || 'Clear';
          daily[key].conditions[cond] = (daily[key].conditions[cond] || 0) + 1;
        });

        let i = 0;
        for (const key in daily) {
          if (i >= 4) break;
          const temps = daily[key].temps;
          const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
          const mostCond = Object.entries(daily[key].conditions).sort((a, b) => b[1] - a[1])[0][0];
          forecast.push({
            day: i === 0 ? 'Today' : key.split(',')[0],
            temp: Math.round(avgTemp),
            condition: mostCond,
          });
          i++;
        }
      }

      const formattedWeather = {
        location: weatherData.current.location?.name || 'Unknown',
        current: {
          temperature: Math.round(weatherData.current.current.temperature),
          high: Math.round(weatherData.current.current.temperature + 2), // Approximation
          low: Math.round(weatherData.current.current.temperature - 2),  // Approximation
          condition: weatherData.current.current.condition,
          humidity: weatherData.current.current.humidity,
          wind: {
            speed: weatherData.current.current.wind?.speed || 0,
          },
        },
        forecast,
      };

      setWeather(formattedWeather);

      // Get ML recommendations from Python backend
      try {
        const recommendationData = await apiService.getRecommendations(
          weatherData.current,
          weatherData.forecast.map(f => ({
            temp: f.temp,
            condition: f.condition,
            description: f.description
          })),
          {
            activityLevel: 0.5,
            stylePreference: 0.5,
          }
        );

        setMlRecommendations(recommendationData.recommendations);
        setWeatherAnalysis(recommendationData.weatherAnalysis);
      } catch (recError) {
        console.error('Error getting recommendations from backend:', recError);
        // Fall back to local recommendations if backend fails
        setMlRecommendations([]);
      }

      setStatus('ready');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to load weather. Please check if the backend is running on port 8000.');
    }
  }, []);

  // Request geolocation
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported in this browser.');
      return;
    }

    setStatus('locating');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        // Handle common errors
        if (err.code === 1) {
          setErrorMsg(
            'Location permission denied. Please enable location in your browser/site settings and try again.'
          );
        } else if (err.code === 2) {
          setErrorMsg('Position unavailable. Check your connection or try again.');
        } else if (err.code === 3) {
          setErrorMsg('Location request timed out.');
        } else {
          setErrorMsg('Unable to get your location.');
        }
        setStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [fetchWeather]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Render states
  if (status === 'init' || status === 'locating') {
    return (
      <div className="container">
        {status === 'locating' ? 'Requesting your location…' : 'Loading…'}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container">
        <p style={{ marginBottom: 12 }}>{errorMsg || 'Something went wrong.'}</p>
        <button className="customize-btn" onClick={requestLocation}>Retry</button>
      </div>
    );
  }

  if (!weather) {
    return <div className="container">Loading…</div>;
  }

  // Use ML recommendations if available, otherwise fall back to simple rules
  const recs = mlRecommendations.length > 0
    ? mlRecommendations.map(rec => rec.item)
    : suggestClothing(weather.current.temperature, weather.current.condition);

  // Generate avatar outfit based on ML recommendations
  const mlOutfit = mlRecommendations.length > 0
    ? AvatarOutfitMapper.mapRecommendationsToAvatar(
        mlRecommendations,
        weather.current.temperature,
        weather.current.condition
      )
    : getAvatarOutfit(weather.current.temperature, weather.current.condition);

  const avatarOptions = {
    ...avatarBase,
    // Only apply ML outfit properties that are explicitly set
    ...(mlOutfit.clothing && { clothing: mlOutfit.clothing }),
    ...(mlOutfit.clothingColor && { clothingColor: mlOutfit.clothingColor }),
    // Only override hair/top if ML specifically provides a hat
    ...(mlOutfit.top && { top: mlOutfit.top }),
    ...(mlOutfit.hatColor && { hatColor: mlOutfit.hatColor }),
    // Keep user's accessory choice if it's not 'none', otherwise use ML recommendation
    accessories: avatarBase.accessories !== 'none' ? avatarBase.accessories : (mlOutfit.accessories || avatarBase.accessories),
    width: 280,
    height: 280,
    style: 'transparent',
  };

  // Handler for user feedback on recommendations - sends to Python backend
  const handleFeedback = async (item, feedbackType) => {
    const recommendation = mlRecommendations.find(rec => rec.item === item);
    if (recommendation) {
      try {
        await apiService.recordFeedback(
          recommendation,
          feedbackType,
          {
            temperature: weather.current.temperature,
            condition: weather.current.condition,
            timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
          }
        );
        console.log('Feedback recorded successfully');
      } catch (error) {
        console.error('Error recording feedback:', error);
      }
    }
  };

  const convertTemp = (celsius) => convertTemperature(celsius, tempUnit);

  // Handler to save avatar customization
  const handleAvatarCustomization = (newConfig) => {
    setAvatarBase(newConfig);
    try {
      localStorage.setItem('avatar_customization', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving avatar customization:', error);
    }
  };

  return (
    <div className="container">
      {/* ⚙️ Button to open modal */}
      <button className="customize-btn" onClick={() => setShowModal(true)}>
        ⚙️ Customize Avatar
      </button>
      <button className="customize-btn" style={{top: '70px'}} onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}>
        °{tempUnit === 'C' ? 'F' : 'C'}
      </button>

      <WeatherHeader location={weather.location} current={weather.current} convertTemp={convertTemp} unit={tempUnit} />
      <Avatar config={avatarOptions} />
      <Recommendations
        items={recs}
        mlRecommendations={mlRecommendations}
        weatherAnalysis={weatherAnalysis}
        onFeedback={handleFeedback}
      />
      <Forecast forecast={weather.forecast} convertTemp={convertTemp} unit={tempUnit} />

      {/* Modal */}
      {showModal && (
        <AvatarCustomizationModal
          baseConfig={avatarBase}
          onApply={handleAvatarCustomization}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default App;
