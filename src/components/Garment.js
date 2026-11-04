import React, { useId } from 'react';
export default function Garment({ item }) {
  const artId = useId().replace(/:/g, '');
  if (item.image)
    return <img className="garment-photo" src={item.image} alt={item.name} />;
  const type = item.style;
  return (
    <svg
      className="garment-art"
      viewBox="0 0 180 180"
      role="img"
      aria-label={item.name}
    >
      <defs>
        <filter
          id={`shadow-${artId}`}
          x="-30%"
          y="-20%"
          width="160%"
          height="160%"
        >
          <feDropShadow dx="1" dy="8" stdDeviation="5" floodOpacity=".22" />
        </filter>
        <linearGradient id={`fabric-${artId}`} x2="1" y2="1">
          <stop stopColor={item.color} />
          <stop offset="1" stopColor={item.color} stopOpacity=".75" />
        </linearGradient>
      </defs>
      <g
        fill={`url(#fabric-${artId})`}
        stroke="#00000025"
        strokeWidth="1.3"
        strokeLinejoin="round"
        filter={`url(#shadow-${artId})`}
      >
        {['tee', 'sweater', 'jacket'].includes(type) && (
          <>
            <path
              d={
                type === 'tee'
                  ? 'M64 35 38 47 18 78 45 93 56 77 53 148Q90 157 127 148L124 77 135 93 162 78 142 47 116 35Z'
                  : 'M65 31 39 43 19 132 44 138 58 79 53 151Q90 158 127 151L122 79 136 138 161 132 141 43 115 31Z'
              }
            />
            <path d="M65 32q25 26 50 0" fill="#00000022" />
            <path
              d="M56 78 61 50M124 78l-5-28M58 144q32 6 64 0"
              fill="none"
              stroke="#ffffff25"
            />
            {type === 'jacket' && (
              <>
                <path d="m65 31 25 23 25-23-6 25-19-2-19 2Z" />
                <path
                  d="M90 54v99M65 73h17v19H65Zm33 0h17v19H98Z"
                  fill="none"
                />
                {[68, 90, 112, 134].map((y) => (
                  <circle key={y} cx="92" cy={y} r="1.4" fill="#d4c9a5" />
                ))}
              </>
            )}
            {type === 'sweater' && (
              <path
                d="M57 145h67M25 128l18 5m94 0 18-5M71 36q19 18 38 0"
                fill="none"
                strokeWidth="5"
              />
            )}
          </>
        )}
        {type === 'pants' && (
          <>
            <path d="M53 25h74l7 128-35 3-9-83-9 83-35-3Z" />
            <path
              d="M53 34h74M90 35v37M59 39q0 24 20 21m42-21q0 24-20 21M49 146l31 2m20 0 31-2"
              fill="none"
              stroke="#ffffff30"
            />
            <circle cx="94" cy="30" r="2" fill="#a7a18d" />
          </>
        )}
        {type === 'shoes' && (
          <>
            <g transform="rotate(-18 90 85)">
              <path d="m34 55 38-4 22 31 40 12q15 5 12 21H29q-7-12 1-26Z" />
              <path
                d="M27 106h119v12H29ZM75 62l-10 6m16 2-10 6m16 2-10 6m16 2-10 6"
                fill="none"
                stroke="#787870"
                strokeWidth="3"
              />
            </g>
            <g transform="translate(3 42) rotate(-13 90 85)">
              <path d="m34 55 38-4 22 31 40 12q15 5 12 21H29q-7-12 1-26Z" />
              <path
                d="M27 106h119v12H29ZM75 62l-10 6m16 2-10 6m16 2-10 6m16 2-10 6"
                fill="none"
                stroke="#787870"
                strokeWidth="3"
              />
            </g>
          </>
        )}
        {type === 'bag' && (
          <>
            <path d="M49 66h82l7 88H42Z" />
            <path
              d="M65 74V43q25-33 50 0v31"
              fill="none"
              stroke={item.color}
              strokeWidth="9"
            />
            <path
              d="m49 72 2 75h77l3-75M66 111q24 12 48 0"
              fill="none"
              stroke="#ffffff35"
            />
          </>
        )}
      </g>
    </svg>
  );
}
