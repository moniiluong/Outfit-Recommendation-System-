/**
 * Clothing recommendation utilities
 * Centralized logic for suggesting clothing based on weather conditions
 */

import { isRainy, isSnowy } from './weatherUtils';

/**
 * Suggest clothing items based on temperature and weather condition
 */
export const suggestClothing = (temp, condition) => {
  const recs = [];

  // Weather-specific recommendations
  if (isRainy(condition)) {
    recs.push('Waterproof jacket', 'Umbrella', 'Waterproof shoes');
  }

  if (isSnowy(condition)) {
    recs.push('Waterproof boots', 'Gloves');
  }

  // Temperature-based recommendations
  if (temp < 5) {
    recs.push('Winter hat', 'Heavy coat', 'Warm layers', 'Long pants', 'Boots');
  } else if (temp < 15) {
    recs.push('Light jacket', 'Sweater', 'Jeans');
  } else if (temp < 22) {
    recs.push('Light shirt', 'Optional jacket', 'Comfortable pants');
  } else if (temp < 28) {
    recs.push('T-shirt', 'Light pants/jeans');
  } else {
    recs.push('Shorts', 'Sunglasses', 'Light clothing', 'Sun hat');
  }

  return recs;
};

/**
 * Get avatar outfit configuration based on temperature and weather
 */
export const getAvatarOutfit = (temp, condition) => {
  if (isRainy(condition)) {
    return { clothing: 'hoodie', clothingColor: 'gray02' };
  }

  if (temp < 0) {
    return { clothing: 'hoodie', clothingColor: 'gray01', top: 'winterHat01', hatColor: 'blue02' };
  }

  if (temp < 5) {
    return { clothing: 'hoodie', clothingColor: 'gray01' };
  }

  if (temp < 15) {
    return { clothing: 'blazerAndSweater', clothingColor: 'blue01' };
  }

  if (temp < 22) {
    return { clothing: 'shirtCrewNeck', clothingColor: 'blue02' };
  }

  if (temp < 28) {
    return { clothing: 'shirtVNeck', clothingColor: 'pastelBlue' };
  }

  return { clothing: 'shirtVNeck', clothingColor: 'white', accessories: 'sunglasses' };
};
