// src/App.js
import React, { useState, useEffect } from 'react';
import './style.css';
import WeatherHeader from './components/WeatherHeader';
import Avatar from './components/Avatar';
import Recommendations from './components/Recommendations';
import Forecast from './components/Forecast';
import AvatarCustomizationModal from './components/AvatarCustomizationModal';

const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const DEFAULT_CITY = 'Raleigh';
const DEFAULT_LAT = 35.7796;
const DEFAULT_LON = -78.6382;

function App() {
  // Weather state
  const [weather, setWeather] = useState(null);

  // Avatar base config
  const [avatarBase, setAvatarBase] = useState({
    skin: 'tanned',
    eyes: 'default',
    eyebrows: 'defaultNatural',
    mouth: 'smile',
    top: 'shortWaved',
    hairColor: 'brown',
    facialHair: 'none',
    accessories: 'none',
  });

  // 👇 Modal state (controls open/close)
  const [showModal, setShowModal] = useState(false);

  // Clothing recommendations
  function suggestClothing(temp, condition) {
    const recs = [];
    const lower = condition.toLowerCase();
    const isRainy = lower.includes("rain") || lower.includes("drizzle");
    const isSnowy = lower.includes("snow");

    if (isRainy) recs.push("Waterproof jacket", "Umbrella", "Waterproof shoes");
    if (isSnowy) recs.push("Waterproof boots", "Gloves");

    if (temp < 5) {
      recs.push("Winter hat", "Heavy coat", "Warm layers", "Long pants", "Boots");
    } else if (temp < 15) {
      recs.push("Light jacket", "Sweater", "Jeans");
    } else if (temp < 22) {
      recs.push("Light shirt", "Optional jacket", "Comfortable pants");
    } else if (temp < 28) {
      recs.push("T-shirt", "Light pants/jeans");
    } else {
      recs.push("Shorts", "Sunglasses", "Light clothing", "Sun hat");
    }
    return recs;
  }

  // Avatar config by weather
  function avatarForWeather(temp, condition) {
    if (condition.toLowerCase().includes("rain")) {
      return { clothing: 'hoodie', clothingColor: 'gray02' };
    } else if (temp < 5) {
      return { clothing: 'hoodie', clothingColor: 'gray01', top: 'winterHat01', hatColor: 'blue02' };
    } else if (temp < 15) {
      return { clothing: 'blazerAndSweater', clothingColor: 'blue01' };
    } else if (temp < 22) {
      return { clothing: 'shirtCrewNeck', clothingColor: 'blue02' };
    } else if (temp < 28) {
      return { clothing: 'shirtVNeck', clothingColor: 'pastelBlue' };
    } else {
      return { clothing: 'shirtVNeck', clothingColor: 'white', accessories: 'sunglasses' };
    }
  }

  // Fetch weather
  async function fetchWeather(lat, lon, city = DEFAULT_CITY) {
    try {
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

      const currentRes = await fetch(currentUrl);
      const currentData = await currentRes.json();
      const forecastRes = await fetch(forecastUrl);
      const forecastData = await forecastRes.json();

      // Process forecast
      const daily = {};
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (!daily[key]) daily[key] = { temps: [], conditions: {} };
        daily[key].temps.push(item.main.temp);
        const cond = item.weather[0].main;
        daily[key].conditions[cond] = (daily[key].conditions[cond] || 0) + 1;
      });

      const forecast = [];
      let i = 0;
      for (const key in daily) {
        if (i >= 4) break;
        const avgTemp = daily[key].temps.reduce((a, b) => a + b, 0) / daily[key].temps.length;
        let mostCond = Object.entries(daily[key].conditions).sort((a, b) => b[1] - a[1])[0][0];
        forecast.push({
          day: i === 0 ? 'Today' : new Date(currentData.dt * 1000 + i * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
          temp: Math.round(avgTemp),
          condition: mostCond,
        });
        i++;
      }

      setWeather({
        location: currentData.name || city,
        current: {
          temperature: Math.round(currentData.main.temp),
          high: Math.round(currentData.main.temp_max),
          low: Math.round(currentData.main.temp_min),
          condition: currentData.weather[0].main,
        },
        forecast,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Load weather on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY)
      );
    } else {
      fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
    }
  }, []);

  if (!weather) return <div className="container">Loading...</div>;

  const recs = suggestClothing(weather.current.temperature, weather.current.condition);
  const avatarOptions = {
    ...avatarBase,
    ...avatarForWeather(weather.current.temperature, weather.current.condition),
    width: 150,
    height: 150,
    style: 'circle',
  };

  return (
    <div className="container">
      {/* ⚙️ Button to open modal */}
      <button className="customize-btn" onClick={() => setShowModal(true)}>
        ⚙️ Customize Avatar
      </button>

      <WeatherHeader location={weather.location} current={weather.current} />
      <Avatar config={avatarOptions} />
      <Recommendations items={recs} />
      <Forecast forecast={weather.forecast} />

      {/* Modal (only shows when showModal = true) */}
      {showModal && (
        <AvatarCustomizationModal
          baseConfig={avatarBase}
          onApply={setAvatarBase}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default App;
