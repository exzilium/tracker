import { Platform } from 'react-native';
import type { Consumption, Session } from '../store';
import { getSessionPacingStats } from './pacingStats';
import type { LockScreenTimerPayload } from '../../modules/lock-screen-timer';

export type { LockScreenTimerPayload };

/**
 * Computes the discreet lock screen stopwatch configuration for an active
 * session without exposing any substance names or dose text.
 */
export function buildLockScreenTimerPayload(
  activeSession: Session | null,
  sessionConsumptions: Consumption[]
): LockScreenTimerPayload | null {
  if (!activeSession || activeSession.endTime !== null) {
    return null;
  }

  const stats = getSessionPacingStats(sessionConsumptions);
  const hasAlcohol = stats.alcoholCount > 0 && stats.lastAlcohol !== null;
  const hasTHC = stats.thcCount > 0 && stats.lastTHC !== null;

  if (hasAlcohol && hasTHC && stats.lastAlcohol && stats.lastTHC) {
    return {
      mode: 'both',
      primaryEpochMs: stats.lastAlcohol.timestamp,
      secondaryEpochMs: stats.lastTHC.timestamp,
    };
  }

  if (hasAlcohol && stats.lastAlcohol) {
    return {
      mode: 'alcohol',
      primaryEpochMs: stats.lastAlcohol.timestamp,
    };
  }

  if (hasTHC && stats.lastTHC) {
    return {
      mode: 'thc',
      primaryEpochMs: stats.lastTHC.timestamp,
    };
  }

  return {
    mode: 'session',
    primaryEpochMs: activeSession.startTime,
  };
}

export async function syncLockScreenTimer(
  payload: LockScreenTimerPayload | null,
  enabled: boolean
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const nativeTimer = require('../../modules/lock-screen-timer') as
      | typeof import('../../modules/lock-screen-timer')
      | undefined;
    if (!nativeTimer) return;

    if (!enabled || !payload) {
      await nativeTimer.stopTimer();
      return;
    }

    await nativeTimer.updateTimer(payload);
  } catch {
    // Graceful no-op in Expo Go, Web, or test environments
  }
}

export async function clearLockScreenTimer(): Promise<void> {
  await syncLockScreenTimer(null, false);
}
