/**
 * Common styles used throughout the application
 * Centralized style constants to reduce duplication
 */

export const buttonStyles = {
  primary: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  secondary: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '12px',
    transition: 'background-color 0.2s',
  },
  success: {
    padding: '10px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  cancel: {
    padding: '10px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  small: {
    fontSize: '11px',
    padding: '3px 8px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '4px',
  },
};

export const feedbackButtonStyles = {
  like: {
    ...buttonStyles.small,
    background: '#4CAF50',
    color: 'white',
  },
  dislike: {
    ...buttonStyles.small,
    background: '#f44336',
    color: 'white',
  },
};

export const badgeStyles = {
  confidence: {
    marginLeft: '8px',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  highConfidence: {
    background: 'rgba(0, 200, 0, 0.2)',
    color: '#006600',
  },
  lowConfidence: {
    background: 'rgba(255, 165, 0, 0.2)',
    color: '#996600',
  },
};

export const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

export const modalContentStyle = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '15px',
  maxWidth: '400px',
  width: '90%',
  maxHeight: '80vh',
  overflowY: 'auto',
};

export const analysisBoxStyle = {
  background: 'rgba(100, 150, 255, 0.1)',
  padding: '12px',
  borderRadius: '8px',
  marginBottom: '12px',
  fontSize: '13px',
};

export const mlRecommendationItemStyle = {
  marginBottom: '10px',
  padding: '10px',
  background: 'rgba(100, 200, 100, 0.05)',
  borderRadius: '6px',
  border: '1px solid rgba(100, 200, 100, 0.2)',
};
