import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../store';
import {
  buildLockScreenTimerPayload,
  syncLockScreenTimer,
} from '../utils/lockScreenTimer';

/**
 * Headless observer keeping the discreet Android lock screen stopwatch in sync
 * with the active session, logged doses, and Settings toggle.
 */
export default function LockScreenTimerSync() {
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const consumptions = useAppStore((state) => state.consumptions);
  const lockScreenTimerEnabled = useAppStore(
    (state) => state.profile.lockScreenTimerEnabled !== false
  );

  const payload = useMemo(() => {
    if (!activeSessionId) return null;
    const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
    if (!activeSession) return null;
    const sessionConsumptions = consumptions.filter(
      (c) => c.sessionId === activeSessionId
    );
    return buildLockScreenTimerPayload(activeSession, sessionConsumptions);
  }, [activeSessionId, sessions, consumptions]);

  useEffect(() => {
    syncLockScreenTimer(payload, lockScreenTimerEnabled);
  }, [payload, lockScreenTimerEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncLockScreenTimer(payload, lockScreenTimerEnabled);
      }
    });
    return () => subscription.remove();
  }, [payload, lockScreenTimerEnabled]);

  return null;
}
