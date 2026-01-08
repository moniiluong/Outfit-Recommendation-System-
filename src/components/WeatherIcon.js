// src/components/WeatherIcon.js
import React from 'react';

const WeatherIcon = ({ condition, size = 60 }) => {
  const getWeatherIcon = (weatherCondition) => {
    const cond = (weatherCondition || '').toLowerCase();

    // Sunny/Clear
    if (cond.includes('clear') || cond.includes('sun')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="20" fill="#FDB813">
            <animate attributeName="r" values="20;22;20" dur="2s" repeatCount="indefinite"/>
          </circle>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={50 + Math.cos((angle * Math.PI) / 180) * 35}
              y2={50 + Math.sin((angle * Math.PI) / 180) * 35}
              stroke="#FDB813"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <animate
                attributeName="opacity"
                values="1;0.5;1"
                dur="2s"
                begin={`${i * 0.125}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>
      );
    }

    // Cloudy
    if (cond.includes('cloud')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M25 60 Q25 45 40 45 Q40 35 50 35 Q60 35 60 45 Q75 45 75 60 Q75 70 65 70 H35 Q25 70 25 60"
            fill="#E0E7EF"
            stroke="#B0BEC5"
            strokeWidth="2"
          >
            <animate attributeName="d"
              values="M25 60 Q25 45 40 45 Q40 35 50 35 Q60 35 60 45 Q75 45 75 60 Q75 70 65 70 H35 Q25 70 25 60;
                      M25 62 Q25 47 40 47 Q40 37 50 37 Q60 37 60 47 Q75 47 75 62 Q75 72 65 72 H35 Q25 72 25 62;
                      M25 60 Q25 45 40 45 Q40 35 50 35 Q60 35 60 45 Q75 45 75 60 Q75 70 65 70 H35 Q25 70 25 60"
              dur="4s" repeatCount="indefinite"/>
          </path>
          <path
            d="M30 55 Q30 42 42 42 Q42 33 52 33 Q62 33 62 42 Q70 42 70 55"
            fill="#F5F7FA"
            stroke="#B0BEC5"
            strokeWidth="2"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 2,0; 0,0"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      );
    }

    // Rainy
    if (cond.includes('rain') || cond.includes('drizzle')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M25 45 Q25 30 40 30 Q40 20 50 20 Q60 20 60 30 Q75 30 75 45 Q75 55 65 55 H35 Q25 55 25 45"
            fill="#78909C"
            stroke="#546E7A"
            strokeWidth="2"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={30 + i * 10}
              y1="60"
              x2={28 + i * 10}
              y2="75"
              stroke="#4FC3F7"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animate
                attributeName="y1"
                values="60;75"
                dur="0.8s"
                begin={`${i * 0.15}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="75;90"
                dur="0.8s"
                begin={`${i * 0.15}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="1;0"
                dur="0.8s"
                begin={`${i * 0.15}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>
      );
    }

    // Snowy
    if (cond.includes('snow')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M25 45 Q25 30 40 30 Q40 20 50 20 Q60 20 60 30 Q75 30 75 45 Q75 55 65 55 H35 Q25 55 25 45"
            fill="#B0BEC5"
            stroke="#90A4AE"
            strokeWidth="2"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <circle
                cx={30 + i * 10}
                cy="65"
                r="3"
                fill="#E3F2FD"
                stroke="#BBDEFB"
                strokeWidth="1"
              >
                <animate
                  attributeName="cy"
                  values="65;85"
                  dur="2s"
                  begin={`${i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="1;0"
                  dur="2s"
                  begin={`${i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>
      );
    }

    // Thunderstorm
    if (cond.includes('thunder') || cond.includes('storm')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M25 40 Q25 25 40 25 Q40 15 50 15 Q60 15 60 25 Q75 25 75 40 Q75 50 65 50 H35 Q25 50 25 40"
            fill="#424242"
            stroke="#212121"
            strokeWidth="2"
          />
          <path
            d="M50 55 L45 70 L52 70 L48 85"
            stroke="#FDD835"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      );
    }

    // Mist/Fog
    if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[35, 45, 55, 65].map((y, i) => (
            <line
              key={i}
              x1="25"
              y1={y}
              x2="75"
              y2={y}
              stroke="#B0BEC5"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <animate
                attributeName="x1"
                values="25;20;25"
                dur="3s"
                begin={`${i * 0.2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="75;80;75"
                dur="3s"
                begin={`${i * 0.2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.7;0.3"
                dur="3s"
                begin={`${i * 0.2}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>
      );
    }

    // Default - Partly Cloudy
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="35" r="15" fill="#FDB813">
          <animate attributeName="r" values="15;17;15" dur="2s" repeatCount="indefinite"/>
        </circle>
        <path
          d="M45 55 Q45 42 57 42 Q57 33 67 33 Q77 33 77 42 Q85 42 85 55 Q85 63 77 63 H53 Q45 63 45 55"
          fill="#E0E7EF"
          stroke="#B0BEC5"
          strokeWidth="2"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 2,0; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    );
  };

  return (
    <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
      {getWeatherIcon(condition)}
    </div>
  );
};

export default WeatherIcon;
