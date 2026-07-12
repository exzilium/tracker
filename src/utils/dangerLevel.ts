export const calculateDangerLevel = (
  currentBAC: number,
  maxBAC: number,
  peakBAC: number,
  currentTHC: number, // mg
  maxTHC: number,  // mg
  peakTHC: number,
  mood: number,    // 1-5
  hunger: number,  // 1-5
  anxiety: number  // 1-5
): { tensionPercent: number } => {
  
  const CROSS_FADE_MULTIPLIER = 0.5;

  const bacPercent = maxBAC > 0 ? (currentBAC / maxBAC) * 100 : 0;
  const thcPercent = maxTHC > 0 ? (currentTHC / maxTHC) * 100 : 0;
  
  const primary = Math.max(bacPercent, thcPercent);
  const secondary = Math.min(bacPercent, thcPercent);

  let baseDanger = primary + (secondary * CROSS_FADE_MULTIPLIER);

  // Subjective Modifiers (Mathematical Penalty) based on 1-5 scale
  if (mood === 1 || mood === 5) baseDanger += 15;
  else if (mood === 2) baseDanger += 5;

  if (hunger === 5) baseDanger += 15;
  else if (hunger === 4) baseDanger += 10;

  // Anxiety Modifiers
  if (anxiety === 5) baseDanger += 15;
  else if (anxiety === 4) baseDanger += 5;

  // Trailing Decay (Mellanby Effect / Hangover)
  // If we are past the peak and on the way down (or at 0), we add a trailing fatigue penalty
  if (peakBAC > 0 && currentBAC < peakBAC * 0.5) {
    // Lingering feeling even when BAC is low
    baseDanger += 10;
  }
  if (peakTHC > 0 && currentTHC < peakTHC * 0.5) {
    baseDanger += 5;
  }

  return {
    tensionPercent: Math.min(baseDanger, 200) // Cap at 200% for UI scaling
  };
};
