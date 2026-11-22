import type { Consumption } from '../store';
import { formatConsumableSubtitle } from './consumableMeta';
import { calculateStandardDrinks } from './mathEngine';

export { formatConsumableSubtitle as formatFavoriteSubtitle };

export interface SessionPacingStats {
  totalStandardDrinks: number;
  alcoholCount: number;
  lastAlcohol: Consumption | null;
  totalTHCMg: number;
  thcCount: number;
  lastTHC: Consumption | null;
}

/**
 * Computes cumulative session intake totals and the most recent alcohol/THC log
 * so the dashboard stopwatch can track dose spacing without scanning elsewhere.
 */
export function getSessionPacingStats(sessionConsumptions: Consumption[]): SessionPacingStats {
  let totalDrinks = 0;
  let alcoholCount = 0;
  let lastAlcohol: Consumption | null = null;

  let totalTHC = 0;
  let thcCount = 0;
  let lastTHC: Consumption | null = null;

  for (const c of sessionConsumptions) {
    if (c.type === 'alcohol') {
      alcoholCount += 1;
      if (
        typeof c.volumeOz === 'number' &&
        Number.isFinite(c.volumeOz) &&
        c.volumeOz > 0 &&
        typeof c.abvPercent === 'number' &&
        Number.isFinite(c.abvPercent) &&
        c.abvPercent > 0
      ) {
        totalDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
      }
      if (
        Number.isFinite(c.timestamp) &&
        (!lastAlcohol || c.timestamp > lastAlcohol.timestamp)
      ) {
        lastAlcohol = c;
      }
    } else if (c.type === 'thc') {
      thcCount += 1;
      if (typeof c.mg === 'number' && Number.isFinite(c.mg) && c.mg > 0) {
        totalTHC += c.mg;
      }
      if (
        Number.isFinite(c.timestamp) &&
        (!lastTHC || c.timestamp > lastTHC.timestamp)
      ) {
        lastTHC = c;
      }
    }
  }

  return {
    totalStandardDrinks: Number(totalDrinks.toFixed(1)),
    alcoholCount,
    lastAlcohol,
    totalTHCMg: Number(totalTHC.toFixed(1)),
    thcCount,
    lastTHC,
  };
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats an elapsed stopwatch duration as MM:SS under 1 hour or H:MM:SS at 1h+.
 * Negative or invalid deltas clamp to 00:00.
 */
export function formatStopwatch(fromTimestamp: number, now: number): string {
  if (!Number.isFinite(fromTimestamp) || !Number.isFinite(now)) {
    return '00:00';
  }
  const totalSeconds = Math.max(0, Math.floor((now - fromTimestamp) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}
