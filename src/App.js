// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './style.css';
import WeatherHeader from './components/WeatherHeader';
import Avatar from './components/Avatar';
import Recommendations from './components/Recommendations';
import Forecast from './components/Forecast';
import AvatarCustomizationModal from './components/AvatarCustomizationModal';
import { WeatherPatternAnalyzer } from './services/weatherPatternAnalyzer';
import { MLRecommendationEngine } from './services/mlRecommendationEngine';
import { UserPreferenceLearning } from './services/userPreferenceLearning';
import { AvatarOutfitMapper } from './services/avatarOutfitMapper';
import { suggestClothing, getAvatarOutfit } from './utils/clothingRecommendations';
import { convertTemperature } from './utils/weatherUtils';

const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

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

  // ML services (using refs to persist across renders)
  const weatherAnalyzer = useRef(null);
  const mlEngine = useRef(null);
  const learningSystem = useRef(null);

  // Initialize ML services
  useEffect(() => {
    if (!weatherAnalyzer.current) {
      weatherAnalyzer.current = new WeatherPatternAnalyzer();
      mlEngine.current = new MLRecommendationEngine();
      learningSystem.current = new UserPreferenceLearning(mlEngine.current);
    }
  }, []);


  // Fetch weather for given coords
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      setStatus('locating');

      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

      const [currentRes, forecastRes] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl),
      ]);

      if (!currentRes.ok) {
        throw new Error(`Weather error: ${currentRes.status}`);
      }
      if (!forecastRes.ok) {
        throw new Error(`Forecast error: ${forecastRes.status}`);
      }

      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();

      // Process forecast into daily buckets
      const daily = {};
      (forecastData.list || []).forEach(item => {
        const date = new Date(item.dt * 1000);
        const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (!daily[key]) daily[key] = { temps: [], conditions: {} };
        daily[key].temps.push(item.main.temp);
        const cond = item.weather?.[0]?.main || 'Clear';
        daily[key].conditions[cond] = (daily[key].conditions[cond] || 0) + 1;
      });

      const forecast = [];
      let i = 0;
      for (const key in daily) {
        if (i >= 4) break;
        const temps = daily[key].temps;
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        const mostCond = Object.entries(daily[key].conditions).sort((a, b) => b[1] - a[1])[0][0];
        forecast.push({
          day: i === 0 ? 'Today' : key.split(',')[0], // short weekday
          temp: Math.round(avgTemp),
          condition: mostCond,
        });
        i++;
      }

      const weatherData = {
        location: currentData.name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        current: {
          temperature: Math.round(currentData.main.temp),
          high: Math.round(currentData.main.temp_max),
          low: Math.round(currentData.main.temp_min),
          condition: currentData.weather?.[0]?.main || 'Clear',
          humidity: currentData.main.humidity,
          wind: {
            speed: currentData.wind?.speed || 0,
          },
        },
        forecast,
      };

      setWeather(weatherData);

      // Generate ML-enhanced recommendations
      if (weatherAnalyzer.current && mlEngine.current) {
        const analysis = weatherAnalyzer.current.analyzeWeatherData(weatherData, forecast);
        setWeatherAnalysis(analysis);

        const recommendations = mlEngine.current.generateRecommendations(analysis, {
          activityLevel: 0.5,
          stylePreference: 0.5,
        });
        setMlRecommendations(recommendations);
      }

      setStatus('ready');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to load weather. Please try again.');
    }
  }, []);

  // Request geolocation
  const requestLocation = useCallback(() => {
    // API key guard
    if (!API_KEY) {
      setStatus('error');
      setErrorMsg(
        'Missing REACT_APP_WEATHER_API_KEY. Add it to your environment (Vercel: Project Settings → Environment Variables) and redeploy.'
      );
      return;
    }

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

  // Handler for user feedback on recommendations
  const handleFeedback = (item, feedbackType) => {
    if (learningSystem.current) {
      const recommendation = mlRecommendations.find(rec => rec.item === item);
      if (recommendation) {
        learningSystem.current.recordFeedback(
          recommendation,
          feedbackType,
          {
            temperature: weather.current.temperature,
            condition: weather.current.condition,
            timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
          }
        );
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
