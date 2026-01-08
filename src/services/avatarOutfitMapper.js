/**
 * Avatar Outfit Mapper
 * Maps ML clothing recommendations to avatar clothing options
 */

import { getAvatarOutfit } from '../utils/clothingRecommendations';

export class AvatarOutfitMapper {
  /**
   * Map ML recommendations to avatar clothing configuration
   * @param {Array} mlRecommendations - Array of ML recommendation objects
   * @param {number} temperature - Current temperature in Celsius
   * @param {string} condition - Weather condition
   * @returns {Object} Avatar clothing configuration
   */
  static mapRecommendationsToAvatar(mlRecommendations, temperature, condition) {
    const outfit = {
      clothing: null,
      clothingColor: null,
      accessories: 'none',
      hatColor: null,
    };

    // Find top category recommendation with highest priority
    const topRec = mlRecommendations
      .filter(rec => rec.category === 'top')
      .sort((a, b) => b.adjustedPriority - a.adjustedPriority)[0];

    // Find outerwear recommendation
    const outerwearRec = mlRecommendations
      .filter(rec => rec.category === 'outerwear')
      .sort((a, b) => b.adjustedPriority - a.adjustedPriority)[0];

    // Find accessories recommendation
    const accessoriesRec = mlRecommendations
      .filter(rec => rec.category === 'accessories')
      .sort((a, b) => b.adjustedPriority - a.adjustedPriority)[0];

    // Find head/hat recommendation
    const headRec = mlRecommendations
      .filter(rec => rec.category === 'head')
      .sort((a, b) => b.adjustedPriority - a.adjustedPriority)[0];

    // Map outerwear and tops to avatar clothing
    if (outerwearRec) {
      const outfitMapping = this.mapOuterwearToAvatarClothing(outerwearRec.item, temperature);
      if (outfitMapping) {
        outfit.clothing = outfitMapping.clothing;
        outfit.clothingColor = outfitMapping.clothingColor;
      }
    } else if (topRec) {
      const outfitMapping = this.mapTopToAvatarClothing(topRec.item, temperature);
      if (outfitMapping) {
        outfit.clothing = outfitMapping.clothing;
        outfit.clothingColor = outfitMapping.clothingColor;
      }
    }

    // Map accessories
    if (accessoriesRec && accessoriesRec.item.toLowerCase().includes('sunglasses')) {
      outfit.accessories = 'sunglasses';
    }

    // Map head items (only for very cold weather with high priority)
    // Otherwise, preserve user's hair choice
    if (headRec && headRec.adjustedPriority > 0.8 && temperature < 5) {
      const hatMapping = this.mapHeadToAvatarHat(headRec.item);
      if (hatMapping) {
        outfit.top = hatMapping.top;
        outfit.hatColor = hatMapping.hatColor;
      }
    }

    // Fallback to weather-based defaults if no ML recommendations matched
    if (!outfit.clothing) {
      const fallback = getAvatarOutfit(temperature, condition);
      Object.assign(outfit, fallback);
    }

    return outfit;
  }

  /**
   * Map outerwear items to avatar clothing
   */
  static mapOuterwearToAvatarClothing(item, temperature) {
    const itemLower = item.toLowerCase();

    if (itemLower.includes('winter coat') || itemLower.includes('heavy coat')) {
      return { clothing: 'hoodie', clothingColor: 'gray01' };
    }

    if (itemLower.includes('warm jacket') || itemLower.includes('jacket')) {
      if (temperature < 10) {
        return { clothing: 'hoodie', clothingColor: 'blue03' };
      }
      return { clothing: 'blazerAndSweater', clothingColor: 'blue01' };
    }

    if (itemLower.includes('light jacket')) {
      return { clothing: 'blazerAndSweater', clothingColor: 'pastelBlue' };
    }

    if (itemLower.includes('waterproof jacket') || itemLower.includes('rain')) {
      return { clothing: 'hoodie', clothingColor: 'gray02' };
    }

    if (itemLower.includes('windbreaker')) {
      return { clothing: 'hoodie', clothingColor: 'blue02' };
    }

    return null;
  }

  /**
   * Map top items to avatar clothing
   */
  static mapTopToAvatarClothing(item, temperature) {
    const itemLower = item.toLowerCase();

    if (itemLower.includes('sweater') || itemLower.includes('cardigan')) {
      if (itemLower.includes('warm')) {
        return { clothing: 'blazerAndSweater', clothingColor: 'gray02' };
      }
      return { clothing: 'blazerAndSweater', clothingColor: 'pastelBlue' };
    }

    if (itemLower.includes('long sleeve')) {
      return { clothing: 'shirtCrewNeck', clothingColor: 'blue02' };
    }

    if (itemLower.includes('shorts')) {
      return { clothing: 'shorts', clothingColor: 'pastelBlue' };
    }

    if (itemLower.includes('t-shirt') || itemLower.includes('tee')) {
      if (temperature > 25) {
        return { clothing: 'shirtVNeck', clothingColor: 'white' };
      }
      return { clothing: 'shirtCrewNeck', clothingColor: 'pastelBlue' };
    }

    if (itemLower.includes('tank top')) {
      return { clothing: 'shirtVNeck', clothingColor: 'white' };
    }

    if (itemLower.includes('blouse') || itemLower.includes('shirt')) {
      return { clothing: 'shirtCrewNeck', clothingColor: 'pastelOrange' };
    }

    return null;
  }

  /**
   * Map head items to avatar hat
   */
  static mapHeadToAvatarHat(item) {
    const itemLower = item.toLowerCase();

    if (itemLower.includes('winter hat') || itemLower.includes('beanie')) {
      return { top: 'winterHat01', hatColor: 'blue02' };
    }

    if (itemLower.includes('sun hat')) {
      return { top: 'hat', hatColor: 'pastelYellow' };
    }

    return null;
  }

}
