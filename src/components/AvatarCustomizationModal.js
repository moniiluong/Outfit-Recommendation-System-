// src/components/AvatarCustomizationModal.js
import React, { useState } from 'react';

export default function AvatarCustomizationModal({ baseConfig, onApply, onClose }) {
  const [config, setConfig] = useState({ ...baseConfig });

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(config);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#333' }}>Customize Your Avatar</h3>

        {/* Skin Tone */}
        <label>Skin Tone:</label>
        <select value={config.skin} onChange={e => handleChange('skin', e.target.value)}>
          <option value="tanned">Tanned</option>
          <option value="yellow">Yellow</option>
          <option value="pale">Pale</option>
          <option value="light">Light</option>
          <option value="brown">Brown</option>
          <option value="darkBrown">Dark Brown</option>
          <option value="black">Black</option>
        </select>

        {/* Hair Style */}
        <label>Hair Style:</label>
        <select value={config.top} onChange={e => handleChange('top', e.target.value)}>
          <option value="shortWaved">Short Waved</option>
          <option value="shortCurly">Short Curly</option>
          <option value="shortFlat">Short Flat</option>
          <option value="bob">Bob</option>
          <option value="curly">Curly</option>
          <option value="straight01">Straight</option>
          <option value="bun">Bun</option>
          <option value="bigHair">Big Hair</option>
        </select>

        {/* Hair Color */}
        <label>Hair Color:</label>
        <select value={config.hairColor} onChange={e => handleChange('hairColor', e.target.value)}>
          <option value="brown">Brown</option>
          <option value="black">Black</option>
          <option value="blonde">Blonde</option>
          <option value="auburn">Auburn</option>
          <option value="red">Red</option>
          <option value="silverGray">Silver Gray</option>
        </select>

        {/* Eyes */}
        <label>Eyes:</label>
        <select value={config.eyes} onChange={e => handleChange('eyes', e.target.value)}>
          <option value="default">Default</option>
          <option value="happy">Happy</option>
          <option value="wink">Wink</option>
          <option value="surprised">Surprised</option>
          <option value="squint">Squint</option>
          <option value="hearts">Hearts</option>
        </select>

        {/* Mouth */}
        <label>Mouth:</label>
        <select value={config.mouth} onChange={e => handleChange('mouth', e.target.value)}>
          <option value="smile">Smile</option>
          <option value="default">Default</option>
          <option value="twinkle">Twinkle</option>
          <option value="serious">Serious</option>
          <option value="eating">Eating</option>
          <option value="tongue">Tongue</option>
        </select>

        {/* Accessories */}
        <label>Accessories:</label>
        <select value={config.accessories} onChange={e => handleChange('accessories', e.target.value)}>
          <option value="none">None</option>
          <option value="sunglasses">Sunglasses</option>
          <option value="prescription01">Glasses</option>
          <option value="round">Round Glasses</option>
          <option value="wayfarers">Wayfarers</option>
        </select>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleApply} style={{ flex: 1, padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px' }}>Apply</button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
