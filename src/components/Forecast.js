// src/components/Forecast.js
import React from 'react';
import WeatherIcon from './WeatherIcon';

export default function Forecast({ forecast, convertTemp, unit }) {
  return (
    <div className="forecast">
      {forecast.map((day, i) => (
        <div className="day" key={i}>
          <p>{day.day}</p>
          <div className="weather-icon">
            <WeatherIcon condition={day.condition} size={35} />
          </div>
          <p><span className="day-temp">{convertTemp(day.temp)}°{unit}</span></p>
        </div>
      ))}
    </div>
  );
}
