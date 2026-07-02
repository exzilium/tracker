import { Consumption, UserProfile } from '../store';
import { calculateBAC, calculateTHCEffect } from './mathEngine';

export const getCurrentLevels = (consumptions: Consumption[], profile: UserProfile, nowOverride?: number) => {
  const now = nowOverride || Date.now();
  let totalBAC = 0;
  let activeTHC = 0;
  let peakTHC = 0; // Legacy return signature compliance, actual peak calculation moved to getPeaks

  consumptions.forEach((c) => {
    const hoursElapsed = (now - c.timestamp) / (1000 * 60 * 60);
    const minutesElapsed = (now - c.timestamp) / (1000 * 60);

    if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
      const bac = calculateBAC(c.volumeOz, c.abvPercent, profile.weight, profile.gender, hoursElapsed, c.durationMins);
      totalBAC += bac;
    }

    if (c.type === 'thc' && c.method && c.mg) {
      const effectPercent = calculateTHCEffect(c.method, Math.max(0, minutesElapsed));
      activeTHC += c.mg * effectPercent;
    }
  });

  // Note: peakTHC is no longer actively simulated here to save O(N^2) rendering costs on graphs.
  // Charts should call getPeaks() independently.

  return { currentBAC: totalBAC, currentTHC: activeTHC, peakTHC };
};

export const getPeaks = (consumptions: Consumption[], profile: UserProfile, nowOverride?: number) => {
  const now = nowOverride || Date.now();
  let peakBAC = 0;
  let peakBACTime = now;
  let peakTHC = 0;
  let peakTHCTime = now;

  if (consumptions.length === 0) {
    return { peakBAC, peakBACTime, peakTHC, peakTHCTime };
  }

  const earliestTime = consumptions.reduce((min, c) => Math.min(min, c.timestamp), now);
  const endTime = now + (8 * 60 * 60 * 1000);

  for (let targetTime = earliestTime; targetTime <= endTime; targetTime += 5 * 60000) {
    let simBAC = 0;
    let simTHC = 0;

    consumptions.forEach((c) => {
      const hoursElapsed = (targetTime - c.timestamp) / (1000 * 60 * 60);
      const minutesElapsed = (targetTime - c.timestamp) / (1000 * 60);

      if (c.type === 'alcohol' && c.volumeOz && c.abvPercent && hoursElapsed >= 0) {
        simBAC += calculateBAC(c.volumeOz, c.abvPercent, profile.weight, profile.gender, hoursElapsed, c.durationMins);
      }
      if (c.type === 'thc' && c.method && c.mg && minutesElapsed >= 0) {
        simTHC += c.mg * calculateTHCEffect(c.method, minutesElapsed);
      }
    });

    if (simBAC > peakBAC) {
      peakBAC = simBAC;
      peakBACTime = targetTime;
    }
    if (simTHC > peakTHC) {
      peakTHC = simTHC;
      peakTHCTime = targetTime;
    }
  }

  return { peakBAC, peakBACTime, peakTHC, peakTHCTime };
};
