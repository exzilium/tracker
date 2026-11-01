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

  const safeCurrentBAC = Number.isFinite(currentBAC) && currentBAC > 0 ? currentBAC : 0;
  const safeCurrentTHC = Number.isFinite(currentTHC) && currentTHC > 0 ? currentTHC : 0;
  const safePeakBAC = Number.isFinite(peakBAC) && peakBAC > 0 ? peakBAC : 0;
  const safePeakTHC = Number.isFinite(peakTHC) && peakTHC > 0 ? peakTHC : 0;

  const bacPercent = Number.isFinite(maxBAC) && maxBAC > 0 ? (safeCurrentBAC / maxBAC) * 100 : 0;
  const thcPercent = Number.isFinite(maxTHC) && maxTHC > 0 ? (safeCurrentTHC / maxTHC) * 100 : 0;
  
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
  if (safePeakBAC > 0 && safeCurrentBAC < safePeakBAC * 0.5) {
    // Lingering feeling even when BAC is low
    baseDanger += 10;
  }
  if (safePeakTHC > 0 && safeCurrentTHC < safePeakTHC * 0.5) {
    baseDanger += 5;
  }

  const clamped = Number.isFinite(baseDanger) ? Math.max(0, Math.min(baseDanger, 200)) : 0;

  return {
    tensionPercent: clamped // Cap at 200% for UI scaling
  };
};
