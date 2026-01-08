/**
 * Weather utility functions
 * Provides common weather condition checking and temperature conversion utilities
 */

/**
 * Check if weather condition indicates rain
 */
export const isRainy = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('rain') || lower.includes('drizzle');
};

/**
 * Check if weather condition indicates snow
 */
export const isSnowy = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('snow');
};

/**
 * Check if weather condition indicates thunderstorm
 */
export const isThunderstorm = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('thunder') || lower.includes('storm');
};

/**
 * Check if weather condition indicates fog/mist
 */
export const isFoggy = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('mist') || lower.includes('fog') || lower.includes('haze');
};

/**
 * Check if weather condition indicates clear/sunny
 */
export const isClear = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('clear') || lower.includes('sun');
};

/**
 * Check if weather condition indicates clouds
 */
export const isCloudy = (condition) => {
  const lower = (condition || '').toLowerCase();
  return lower.includes('cloud');
};

/**
 * Convert temperature between Celsius and Fahrenheit
 */
export const convertTemperature = (celsius, targetUnit = 'C') => {
  if (targetUnit === 'F') {
    return Math.round((celsius * 9/5) + 32);
  }
  return celsius;
};

/**
 * Get temperature range category
 */
export const getTemperatureRange = (temp) => {
  if (temp < 0) return 'freezing';
  if (temp < 5) return 'very_cold';
  if (temp < 15) return 'cold';
  if (temp < 22) return 'mild';
  if (temp < 28) return 'warm';
  return 'hot';
};
