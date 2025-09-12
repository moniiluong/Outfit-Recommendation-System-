// src/components/Avatar.js
import React from 'react';
import Avataaars from '../avataaars';

export default function Avatar({ config }) {
  const svg = Avataaars.create(config);

  return (
    <div className="human-figure-container">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
