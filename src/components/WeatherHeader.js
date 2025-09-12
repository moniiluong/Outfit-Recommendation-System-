// src/components/WeatherHeader.js
import React from 'react';

export default function WeatherHeader({ location, current }) {
  return (
    <div className="weather-header">
      <h1>{location}</h1>
      <p className="current-temp">{current.temperature}°C</p>
      <p className="high-low">H:{current.high}° L:{current.low}°</p>
    </div>
  );
}
