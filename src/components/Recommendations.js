// src/components/Recommendations.js
import React from 'react';

export default function Recommendations({ items }) {
  return (
    <div className="recommendations">
      <h2>What clothes recommended for today</h2>
      <ul>
        {items.length > 0
          ? items.map((item, i) => <li key={i}>- {item}</li>)
          : <li>- No specific recommendations, dress comfortably!</li>}
      </ul>
    </div>
  );
}
