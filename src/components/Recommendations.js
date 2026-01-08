// src/components/Recommendations.js
import React, { useState } from 'react';
import {
  buttonStyles,
  feedbackButtonStyles,
  badgeStyles,
  analysisBoxStyle,
  mlRecommendationItemStyle
} from '../styles/commonStyles';

export default function Recommendations({ items, mlRecommendations = [], weatherAnalysis, onFeedback }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(new Set());

  const handleFeedbackClick = (item, feedbackType) => {
    if (onFeedback) {
      onFeedback(item, feedbackType);
      // Mark this item as having received feedback
      setFeedbackGiven(prev => new Set([...prev, item]));
      // Visual feedback
      alert(`Thanks for your feedback on "${item}"!`);
    }
  };

  const toggleItemDetails = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  return (
    <div className="recommendations">
      <h2>Outfit Recommendations</h2>

      {weatherAnalysis && (
        <button
          style={{
            ...buttonStyles.secondary,
            marginBottom: '12px',
            position: 'static'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          {showAnalysis ? 'Hide' : 'Show'} Weather Analysis
        </button>
      )}

      {showAnalysis && weatherAnalysis && (
        <div style={analysisBoxStyle}>
          <div><strong>Weather Insights:</strong></div>
          <div style={{ marginTop: '6px' }}>
            • Feels like: {weatherAnalysis.currentConditions.feelsLike.toFixed(1)}°C
          </div>
          <div>
            • Comfort level: {weatherAnalysis.comfortIndex.level}
          </div>
          <div>
            • Precipitation risk: {weatherAnalysis.precipitationRisk.level}
          </div>
          <div>
            • Temperature trend: {weatherAnalysis.temperatureTrend.trend}
          </div>
          <div>
            • Weather stability: {weatherAnalysis.weatherStability.level}
          </div>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.length > 0
          ? items.map((item, i) => {
              const mlRec = mlRecommendations.find(rec => rec.item === item);
              const hasMLData = mlRec && mlRec.confidence;

              return (
                <li key={i} style={hasMLData ? mlRecommendationItemStyle : { marginBottom: '10px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span onClick={() => hasMLData && toggleItemDetails(i)} style={{ cursor: hasMLData ? 'pointer' : 'default' }}>
                      - {item}
                      {hasMLData && (
                        <span style={{
                          ...badgeStyles.confidence,
                          ...(mlRec.confidence > 70 ? badgeStyles.highConfidence : badgeStyles.lowConfidence),
                        }}>
                          {mlRec.confidence}% confident
                        </span>
                      )}
                    </span>
                    {hasMLData && !feedbackGiven.has(item) && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleFeedbackClick(item, 'like')}
                          style={feedbackButtonStyles.like}
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleFeedbackClick(item, 'dislike')}
                          style={feedbackButtonStyles.dislike}
                        >
                          👎
                        </button>
                      </div>
                    )}
                    {hasMLData && feedbackGiven.has(item) && (
                      <span style={{
                        fontSize: '11px',
                        color: '#4CAF50',
                        fontStyle: 'italic',
                        padding: '3px 8px'
                      }}>
                        ✓ Feedback recorded
                      </span>
                    )}
                  </div>
                  {hasMLData && expandedItem === i && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}>
                      <div><strong>Why this recommendation:</strong></div>
                      <div style={{ marginTop: '4px' }}>{mlRec.reasoning}</div>
                      <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.8 }}>
                        Category: {mlRec.category} • Priority: {Math.round(mlRec.adjustedPriority * 100)}%
                      </div>
                    </div>
                  )}
                </li>
              );
            })
          : <li>- No specific recommendations, dress comfortably!</li>}
      </ul>

      {mlRecommendations.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.7, fontStyle: 'italic' }}>
          💡 Recommendations improve as you provide feedback. Click items to see reasoning.
        </div>
      )}
    </div>
  );
}
