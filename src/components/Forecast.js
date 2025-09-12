// src/components/Forecast.js
import React from 'react';

function getWeatherIconName(conditionMain) {
  const lower = conditionMain.toLowerCase();
  if (lower.includes('clear')) return 'clear';
  if (lower.includes('cloud')) return 'clouds';
  if (lower.includes('rain')) return 'rain';
  if (lower.includes('drizzle')) return 'drizzle';
  if (lower.includes('thunderstorm')) return 'thunderstorm';
  if (lower.includes('snow')) return 'snow';
  if (lower.includes('mist') || lower.includes('fog') || lower.includes('haze')) return 'mist';
  return 'clear';
}

export default function Forecast({ forecast }) {
  return (
    <div className="forecast">
      {forecast.map((day, i) => (
        <div className="day" key={i}>
          <p>{day.day}</p>
          <img
            src={`images/${getWeatherIconName(day.condition)}.svg`}
            alt="Weather Icon"
            className="weather-icon"
          />
          <p><span className="day-temp">{day.temp}</span>°C</p>
        </div>
      ))}
    </div>
  );
}
