import { Gender } from '../store';

/**
 * Widmark Formula for estimating Blood Alcohol Concentration (BAC)
 * 
 * BAC = [Alcohol consumed in grams / (Body weight in grams * r)] * 100
 * where r is the gender constant (0.68 for men, 0.55 for women)
 * Then, we subtract the metabolic burn rate (approx 0.015 per hour).
 */

const WIDMARK_CONSTANT = {
  male: 0.68,
  female: 0.55,
  other: 0.61, // Average of male and female
};

const METABOLIC_RATE_PER_HOUR = 0.015;

export const calculateBAC = (
  volumeOz: number,
  abvPercent: number,
  weightLbs: number,
  gender: Gender,
  hoursElapsed: number,
  durationMins: number = 0
): number => {
  if (weightLbs <= 0 || hoursElapsed < 0) return 0;

  // Convert volume from fluid ounces to milliliters (1 oz = 29.5735 ml)
  const volumeMl = volumeOz * 29.5735;
  
  // Calculate grams of alcohol (density of ethanol is 0.789 g/ml)
  const totalAlcoholGrams = volumeMl * (abvPercent / 100) * 0.789;
  
  // Distribute absorption over durationMins
  const minutesElapsed = hoursElapsed * 60;
  let absorbedRatio = 1;
  if (durationMins > 0) {
    absorbedRatio = Math.min(1, Math.max(0, minutesElapsed / durationMins));
  }
  const alcoholGrams = totalAlcoholGrams * absorbedRatio;
  
  // Convert body weight from lbs to grams
  const weightGrams = weightLbs * 453.592;
  
  const r = WIDMARK_CONSTANT[gender];
  
  // Base BAC without burnoff
  const rawBAC = (alcoholGrams / (weightGrams * r)) * 100;
  
  // Subtract burnoff based on time
  const currentBAC = rawBAC - (METABOLIC_RATE_PER_HOUR * hoursElapsed);
  
  return Math.max(0, currentBAC); // BAC cannot be negative
};

/**
 * Calculate Standard Drinks (US Definition)
 * 1 standard drink = 14 grams of pure alcohol
 * volumeMl = volumeOz * 29.5735
 * grams = volumeMl * (abv / 100) * 0.789
 */
export const calculateStandardDrinks = (volumeOz: number, abvPercent: number): number => {
  if (!volumeOz || !abvPercent) return 0;
  const volumeMl = volumeOz * 29.5735;
  const grams = volumeMl * (abvPercent / 100) * 0.789;
  return Number((grams / 14).toFixed(1)); // round to 1 decimal
};

/**
 * THC Pharmacokinetic Curves
 * Returns the estimated percentage of "peak" effect (0.0 to 1.0)
 * based on the ingestion method and time elapsed.
 */
export type IngestionMethod = 'inhaled' | 'edible';

export const calculateTHCEffect = (
  method: IngestionMethod,
  minutesElapsed: number
): number => {
  if (minutesElapsed < 0) return 0;

  if (method === 'inhaled') {
    // Inhaled: Peak at ~20 mins, burndown over 3 hours
    if (minutesElapsed <= 20) {
      // Linear ramp up to peak
      return Math.min(1.0, minutesElapsed / 20);
    } else if (minutesElapsed <= 180) {
      // Linear burndown from 20 to 180 mins
      const remainingTime = 180 - minutesElapsed;
      return remainingTime / 160;
    }
    return 0;
  } else {
    // Edible: Peak at ~120 mins, burndown over 8 hours
    if (minutesElapsed <= 120) {
      // Slower ramp up
      return Math.min(1.0, minutesElapsed / 120);
    } else if (minutesElapsed <= 480) {
      const remainingTime = 480 - minutesElapsed;
      return remainingTime / 360;
    }
    return 0;
  }
};
