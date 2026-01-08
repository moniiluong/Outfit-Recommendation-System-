// src/components/WeatherHeader.js
import React from 'react';
import WeatherIcon from './WeatherIcon';

export default function WeatherHeader({ location, current, convertTemp, unit }) {
  return (
    <div className="weather-header">
      <h1>{location}</h1>
      <div style={{ margin: '10px 0' }}>
        <WeatherIcon condition={current.condition} size={50} />
      </div>
      <p className="current-temp">{convertTemp(current.temperature)}°{unit}</p>
      <p style={{
        fontSize: '0.9em',
        color: '#667eea',
        fontWeight: '600',
        margin: '5px 0 8px 0',
        textTransform: 'capitalize'
      }}>
        {current.condition}
      </p>
      <p className="high-low">H:{convertTemp(current.high)}° L:{convertTemp(current.low)}°</p>
    </div>
  );
}
