import { Consumption, UserProfile } from '../store';
import {
  calculateAbsorbedRawBAC,
  calculateTHCEffect,
  METABOLIC_RATE_PER_HOUR,
} from './mathEngine';

export const KG_TO_LBS = 2.20462262185;

export const getProfileWeightLbs = (profile: UserProfile): number => {
  if (!profile || !Number.isFinite(profile.weight) || profile.weight <= 0) {
    return 0;
  }
  return profile.units === 'metric' ? profile.weight * KG_TO_LBS : profile.weight;
};

/**
 * Chronologically integrates BAC across multiple drinks using a single metabolic
 * elimination pool (0.015%/hr) whenever BAC > 0.
 *
 * Because absorption is piecewise-linear on each interval between drink start/finish
 * timestamps, we also check whether net absorption rate drops below metabolic burnoff
 * mid-interval (when a drink finishes absorbing while others are already absorbed) and
 * clamp the pool at 0 if it empties during an interval.
 */
export const integrateSessionBAC = (
  alcoholLogs: Consumption[],
  weightLbs: number,
  gender: UserProfile['gender'],
  targetTime: number
): number => {
  if (!Number.isFinite(weightLbs) || weightLbs <= 0 || alcoholLogs.length === 0) {
    return 0;
  }

  const activeLogs = alcoholLogs.filter(
    (c) =>
      Number.isFinite(c.timestamp) &&
      c.timestamp <= targetTime &&
      Number.isFinite(c.volumeOz) &&
      (c.volumeOz ?? 0) > 0 &&
      Number.isFinite(c.abvPercent) &&
      (c.abvPercent ?? 0) > 0
  );

  if (activeLogs.length === 0) return 0;

  const breakpoints = new Set<number>([targetTime]);
  for (const c of activeLogs) {
    breakpoints.add(c.timestamp);
    const durMins = Number.isFinite(c.durationMins) && (c.durationMins ?? 0) > 0 ? (c.durationMins as number) : 0;
    if (durMins > 0) {
      const endAbsorb = c.timestamp + durMins * 60000;
      if (endAbsorb < targetTime) {
        breakpoints.add(endAbsorb);
      }
    }
  }

  const sortedTimes = Array.from(breakpoints).sort((a, b) => a - b);

  const totalAbsorbedAt = (t: number): number => {
    let sum = 0;
    for (const c of activeLogs) {
      if (t >= c.timestamp) {
        sum += calculateAbsorbedRawBAC(
          c.volumeOz || 0,
          c.abvPercent || 0,
          weightLbs,
          gender,
          (t - c.timestamp) / 60000,
          c.durationMins || 0
        );
      }
    }
    return sum;
  };

  let poolBAC = totalAbsorbedAt(sortedTimes[0]);
  let prevAbsorbed = poolBAC;

  for (let i = 1; i < sortedTimes.length; i++) {
    const dtHours = (sortedTimes[i] - sortedTimes[i - 1]) / (1000 * 60 * 60);
    const currAbsorbed = totalAbsorbedAt(sortedTimes[i]);
    const deltaAbsorbed = currAbsorbed - prevAbsorbed;
    const burnoff = METABOLIC_RATE_PER_HOUR * dtHours;

    poolBAC = Math.max(0, poolBAC + deltaAbsorbed - burnoff);
    prevAbsorbed = currAbsorbed;
  }

  return poolBAC;
};

export const getCurrentLevels = (
  consumptions: Consumption[],
  profile: UserProfile,
  nowOverride?: number
) => {
  const now = nowOverride ?? Date.now();
  const weightLbs = getProfileWeightLbs(profile);
  const alcoholLogs: Consumption[] = [];
  let activeTHC = 0;
  const peakTHC = 0; // Legacy return signature compliance, actual peak calculation moved to getPeaks

  for (const c of consumptions) {
    if (c.type === 'alcohol' && (c.volumeOz ?? 0) > 0 && (c.abvPercent ?? 0) > 0) {
      alcoholLogs.push(c);
    } else if (c.type === 'thc' && c.method && (c.mg ?? 0) > 0 && Number.isFinite(c.timestamp)) {
      const minutesElapsed = (now - c.timestamp) / (1000 * 60);
      if (minutesElapsed >= 0) {
        const effectPercent = calculateTHCEffect(c.method, minutesElapsed);
        activeTHC += (c.mg as number) * effectPercent;
      }
    }
  }

  const totalBAC = integrateSessionBAC(alcoholLogs, weightLbs, profile.gender, now);

  return { currentBAC: totalBAC, currentTHC: activeTHC, peakTHC };
};

export const getPeaks = (
  consumptions: Consumption[],
  profile: UserProfile,
  nowOverride?: number
) => {
  const now = nowOverride ?? Date.now();
  let peakBAC = 0;
  let peakBACTime = now;
  let peakTHC = 0;
  let peakTHCTime = now;

  if (consumptions.length === 0) {
    return { peakBAC, peakBACTime, peakTHC, peakTHCTime };
  }

  const validTimestamps = consumptions
    .map((c) => c.timestamp)
    .filter((ts) => Number.isFinite(ts));

  if (validTimestamps.length === 0) {
    return { peakBAC, peakBACTime, peakTHC, peakTHCTime };
  }

  const earliestTime = Math.min(...validTimestamps, now);
  const latestTime = Math.max(...validTimestamps, now);
  // Cap simulation window to at most 24h before latestTime and +8h after latestTime to prevent unbounded loops
  const startSimTime = Math.max(earliestTime, latestTime - 24 * 60 * 60 * 1000);
  const endTime = Math.max(now, latestTime) + 8 * 60 * 60 * 1000;

  const candidateTimes = new Set<number>([now]);
  for (let targetTime = startSimTime; targetTime <= endTime; targetTime += 5 * 60000) {
    candidateTimes.add(targetTime);
  }
  // Include exact piecewise-linear vertices so sharp peaks between 5-min ticks are never missed
  for (const c of consumptions) {
    if (!Number.isFinite(c.timestamp)) continue;
    if (c.timestamp >= startSimTime && c.timestamp <= endTime) {
      candidateTimes.add(c.timestamp);
    }
    if (c.type === 'alcohol') {
      const durMs = Math.max(0, (c.durationMins || 0) * 60000);
      const endAbsorb = c.timestamp + durMs;
      if (endAbsorb >= startSimTime && endAbsorb <= endTime) {
        candidateTimes.add(endAbsorb);
      }
    } else if (c.type === 'thc') {
      const peakOffsetMins = c.method === 'inhaled' ? 20 : 120;
      const peakTime = c.timestamp + peakOffsetMins * 60000;
      if (peakTime >= startSimTime && peakTime <= endTime) {
        candidateTimes.add(peakTime);
      }
    }
  }

  const sortedCandidates = Array.from(candidateTimes).sort((a, b) => a - b);
  for (const targetTime of sortedCandidates) {
    const { currentBAC: simBAC, currentTHC: simTHC } = getCurrentLevels(
      consumptions,
      profile,
      targetTime
    );

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
