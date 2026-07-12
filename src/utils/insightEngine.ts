export interface InsightParams {
  tensionPercent: number;
  currentBAC: number;
  maxBAC: number;
  currentTHC: number;
  maxTHC: number;
  peakBAC?: number;
  peakTHC?: number;
  mood: number;
  hunger: number;
  anxiety: number;
  isProjectedToSpike?: boolean;
  isBACRising?: boolean;
  didTensionDrop?: boolean;
}

export const generateInsight = (params: InsightParams): string => {
  const {
    tensionPercent,
    currentBAC,
    maxBAC,
    currentTHC,
    maxTHC,
    peakBAC = 0,
    peakTHC = 0,
    mood,
    hunger,
    anxiety,
    isProjectedToSpike,
    isBACRising,
    didTensionDrop
  } = params;

  // 1. High-Priority Overrides (The Deltas)
  const noActiveHighs = currentBAC <= 0.01 && currentTHC <= 1.0;
  const hadPastHigh = peakBAC > 0.01 || peakTHC > 1.0;

  if (noActiveHighs && hadPastHigh) {
    return "You're physically back down. You might still feel some lingering effects, so take it easy if you decide to go back up.";
  }

  if (currentBAC >= maxBAC) {
    return "Your physical BAC has crossed your limit. Stop consuming.";
  }

  if (isProjectedToSpike) {
    return "You might feel fine now, but projected digestion shows you approaching your limits soon. Consider slowing down.";
  }

  if (didTensionDrop && isBACRising) {
    return "You might be feeling more relaxed, but your physical BAC is still climbing. Coast for a bit.";
  }

  // 2. The Modular Builder (Standard Cases)
  const bacPercent = maxBAC > 0 ? (currentBAC / maxBAC) * 100 : 0;
  const thcPercent = maxTHC > 0 ? (currentTHC / maxTHC) * 100 : 0;
  
  // A. Core Status
  let statusStr = "";
  if (tensionPercent < 20) statusStr = "You're just getting started";
  else if (tensionPercent < 85) statusStr = "You're at an ideal level";
  else statusStr = "Your levels are elevated";

  // B. Primary Culprit
  let culpritStr = "";
  let actionStr = "Pace yourself and enjoy the ride.";

  const isCrossFade = bacPercent > 10 && thcPercent > 10;
  const crossFadePenalty = Math.min(bacPercent, thcPercent) * 0.5;

  let maxPenalty = 0;
  let primaryCulprit = "none";

  if (isCrossFade && crossFadePenalty > maxPenalty) {
    maxPenalty = crossFadePenalty;
    primaryCulprit = "crossfade";
  }

  const hungerPenalty = hunger === 5 ? 15 : (hunger === 4 ? 10 : 0);
  if (hungerPenalty > maxPenalty) {
    maxPenalty = hungerPenalty;
    primaryCulprit = "hunger";
  }

  const anxietyPenalty = anxiety === 5 ? 15 : (anxiety === 4 ? 5 : 0);
  const moodPenalty = (mood === 1 || mood === 5) ? 15 : (mood === 2 ? 5 : 0);
  const mentalPenalty = Math.max(anxietyPenalty, moodPenalty);
  
  if (mentalPenalty > maxPenalty) {
    maxPenalty = mentalPenalty;
    primaryCulprit = "mental";
  }

  if (primaryCulprit === "crossfade") {
    culpritStr = ", and the cross-fade is likely amplifying your buzz.";
    actionStr = "Switch to water for a bit to let things settle.";
  } else if (primaryCulprit === "hunger") {
    culpritStr = ", and an empty stomach might be making things hit harder.";
    actionStr = "Try to grab some carbs.";
  } else if (primaryCulprit === "mental") {
    culpritStr = ", and your current mood might be adding to the mental load.";
    actionStr = "Take a breather or switch to water to protect your vibe.";
  } else {
    // No major subjective culprit, it's just the physical amount
    if (tensionPercent > 50) {
       culpritStr = ".";
    }
  }

  return `${statusStr}${culpritStr} ${actionStr}`;
};
