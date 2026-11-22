import type { Consumption, Session, UserProfile } from '../store';
import { getCurrentLevels } from './currentLevels';

export const ACCIDENTAL_CLOSE_GRACE_MS = 60 * 60 * 1000; // 60 minutes
export const ACTIVE_BAC_THRESHOLD = 0.001;
export const ACTIVE_THC_THRESHOLD = 0.1;

export type OverlapReason = 'interval' | 'metabolic' | 'recent';

export interface OverlappingSessionMatch {
  session: Session;
  itemCount: number;
  reason: OverlapReason;
}

export interface SessionSpan {
  spanStart: number;
  spanEnd: number;
}

/**
 * Computes the effective [start, end] time span of a session including all of
 * its logged consumption timestamps.
 */
export function getSessionEffectiveSpan(
  session: Session,
  sessionConsumptions: Consumption[],
  now = Date.now()
): SessionSpan {
  const validLogTimestamps = sessionConsumptions
    .map((c) => c.timestamp)
    .filter((ts) => Number.isFinite(ts));

  const spanStart =
    validLogTimestamps.length > 0
      ? Math.min(session.startTime, ...validLogTimestamps)
      : session.startTime;

  const baseEnd = session.endTime ?? now;
  const spanEnd =
    validLogTimestamps.length > 0
      ? Math.max(baseEnd, ...validLogTimestamps)
      : baseEnd;

  return { spanStart, spanEnd };
}

function indexConsumptionsBySession(consumptions: Consumption[]): Map<string, Consumption[]> {
  const bySession = new Map<string, Consumption[]>();
  for (const c of consumptions) {
    const list = bySession.get(c.sessionId);
    if (list) {
      list.push(c);
    } else {
      bySession.set(c.sessionId, [c]);
    }
  }
  return bySession;
}

/**
 * Detects closed sessions that overlap with a candidate consumption logged at
 * `targetTimestamp` (via interval intersection, still-active BAC/THC levels, or
 * a 60-minute accidental-close grace window).
 */
export function findOverlappingClosedSessions(
  sessions: Session[],
  consumptions: Consumption[],
  profile: UserProfile,
  targetTimestamp: number,
  pendingItem?: Partial<Consumption>
): OverlappingSessionMatch[] {
  if (!Number.isFinite(targetTimestamp)) return [];

  const bySession = indexConsumptionsBySession(consumptions);
  const matches: OverlappingSessionMatch[] = [];

  for (const session of sessions) {
    if (session.endTime === null) continue;

    const sLogs = bySession.get(session.id) || [];
    const { spanStart, spanEnd } = getSessionEffectiveSpan(session, sLogs, targetTimestamp);

    let reason: OverlapReason | null = null;

    if (targetTimestamp >= spanStart && targetTimestamp <= spanEnd) {
      reason = 'interval';
    } else if (targetTimestamp > spanStart && sLogs.length > 0) {
      const levels = getCurrentLevels(sLogs, profile, targetTimestamp);
      if (
        levels.currentBAC > ACTIVE_BAC_THRESHOLD ||
        levels.currentTHC > ACTIVE_THC_THRESHOLD
      ) {
        reason = 'metabolic';
      }
    } else if (targetTimestamp < spanStart && pendingItem && pendingItem.type) {
      const synthetic: Consumption = {
        id: 'pending-check',
        sessionId: session.id,
        type: pendingItem.type,
        name: pendingItem.name || 'Item',
        timestamp: targetTimestamp,
        durationMins: pendingItem.durationMins,
        volumeOz: pendingItem.volumeOz,
        abvPercent: pendingItem.abvPercent,
        method: pendingItem.method,
        mg: pendingItem.mg,
      };
      const levelsAtSessionStart = getCurrentLevels([synthetic], profile, spanStart);
      if (
        levelsAtSessionStart.currentBAC > ACTIVE_BAC_THRESHOLD ||
        levelsAtSessionStart.currentTHC > ACTIVE_THC_THRESHOLD
      ) {
        reason = 'metabolic';
      }
    }

    if (!reason) {
      const withinAfterGrace =
        targetTimestamp >= spanEnd &&
        targetTimestamp - spanEnd <= ACCIDENTAL_CLOSE_GRACE_MS;
      const withinBeforeGrace =
        targetTimestamp < spanStart &&
        spanStart - targetTimestamp <= ACCIDENTAL_CLOSE_GRACE_MS;

      if (withinAfterGrace || withinBeforeGrace) {
        reason = 'recent';
      }
    }

    if (reason) {
      matches.push({
        session,
        itemCount: sLogs.length,
        reason,
      });
    }
  }

  return matches.sort(
    (a, b) => (b.session.endTime ?? b.session.startTime) - (a.session.endTime ?? a.session.startTime)
  );
}

/**
 * Checks whether two sessions overlap by time interval, 60-minute accidental-close
 * proximity, or lingering metabolic BAC/THC levels from the earlier session.
 */
export function doSessionsOverlap(
  sessionA: Session,
  logsA: Consumption[],
  sessionB: Session,
  logsB: Consumption[],
  profile: UserProfile,
  now = Date.now()
): boolean {
  const spanA = getSessionEffectiveSpan(sessionA, logsA, now);
  const spanB = getSessionEffectiveSpan(sessionB, logsB, now);

  const aIsEarlier = spanA.spanStart <= spanB.spanStart;
  const earlierSpan = aIsEarlier ? spanA : spanB;
  const laterSpan = aIsEarlier ? spanB : spanA;
  const earlierLogs = aIsEarlier ? logsA : logsB;

  // 1. Direct interval intersection
  if (laterSpan.spanStart <= earlierSpan.spanEnd) {
    return true;
  }

  // 2. Accidental-close grace window
  if (laterSpan.spanStart - earlierSpan.spanEnd <= ACCIDENTAL_CLOSE_GRACE_MS) {
    return true;
  }

  // 3. Lingering metabolic BAC / THC levels from earlier session at later start
  if (earlierLogs.length > 0) {
    const levels = getCurrentLevels(earlierLogs, profile, laterSpan.spanStart);
    if (
      levels.currentBAC > ACTIVE_BAC_THRESHOLD ||
      levels.currentTHC > ACTIVE_THC_THRESHOLD
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Groups sessions into connected overlap clusters containing 2 or more sessions.
 */
export function findOverlapClusters(
  sessions: Session[],
  consumptions: Consumption[],
  profile: UserProfile,
  now = Date.now()
): Session[][] {
  if (sessions.length < 2) return [];

  const bySession = indexConsumptionsBySession(consumptions);
  const visited = new Set<string>();
  const clusters: Session[][] = [];

  for (let i = 0; i < sessions.length; i++) {
    const seed = sessions[i];
    if (visited.has(seed.id)) continue;

    const component: Session[] = [];
    const queue: Session[] = [seed];
    visited.add(seed.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const currentLogs = bySession.get(current.id) || [];

      for (const candidate of sessions) {
        if (visited.has(candidate.id)) continue;
        const candidateLogs = bySession.get(candidate.id) || [];
        if (doSessionsOverlap(current, currentLogs, candidate, candidateLogs, profile, now)) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      }
    }

    if (component.length >= 2) {
      component.sort((a, b) => a.startTime - b.startTime);
      clusters.push(component);
    }
  }

  return clusters.sort((a, b) => b[0].startTime - a[0].startTime);
}

export interface MergeResult {
  sessions: Session[];
  consumptions: Consumption[];
  activeSessionId: string | null;
  mergedSessionId: string | null;
}

/**
 * Pure lossless merge of 2+ sessions: preserves all consumptions, spans the full
 * earliest-to-latest bounds, preserves active status, and keeps the most recent
 * explicit Vibe Check ratings.
 */
export function computeMergedSession(
  sessions: Session[],
  consumptions: Consumption[],
  sessionIds: string[],
  activeSessionId: string | null
): MergeResult {
  const uniqueIds = Array.from(new Set(sessionIds));
  const targetSet = new Set(uniqueIds);
  const matching = sessions
    .filter((s) => targetSet.has(s.id))
    .sort((a, b) => a.startTime - b.startTime);

  if (matching.length < 2) {
    return {
      sessions,
      consumptions,
      activeSessionId,
      mergedSessionId: null,
    };
  }

  const matchingIdSet = new Set(matching.map((s) => s.id));
  const surviving =
    (activeSessionId ? matching.find((s) => s.id === activeSessionId) : undefined) ??
    matching[0];

  const updatedConsumptions = consumptions.map((c) =>
    matchingIdSet.has(c.sessionId) ? { ...c, sessionId: surviving.id } : c
  );

  const mergedLogs = updatedConsumptions.filter((c) => c.sessionId === surviving.id);
  const validLogTimes = mergedLogs
    .map((c) => c.timestamp)
    .filter((ts) => Number.isFinite(ts));

  const mergedStartTime = Math.min(
    ...matching.map((s) => s.startTime),
    ...validLogTimes
  );

  const isActive = matching.some(
    (s) => s.id === activeSessionId || s.endTime === null
  );
  const mergedEndTime = isActive
    ? null
    : Math.max(
        ...matching.map((s) => s.endTime ?? s.startTime),
        ...validLogTimes
      );

  const checkedInSessions = matching.filter((s) => s.hasSubjectiveCheckIn !== false);
  let mood = 3;
  let hunger = 3;
  let anxiety = 3;
  let hasSubjectiveCheckIn = false;

  if (checkedInSessions.length > 0) {
    const latestCheckIn = [...checkedInSessions].sort(
      (a, b) => (b.endTime ?? b.startTime) - (a.endTime ?? a.startTime)
    )[0];
    mood = latestCheckIn.mood;
    hunger = latestCheckIn.hunger;
    anxiety = latestCheckIn.anxiety;
    hasSubjectiveCheckIn = true;
  }

  const mergedSession: Session = {
    id: surviving.id,
    startTime: mergedStartTime,
    endTime: mergedEndTime,
    mood,
    hunger,
    anxiety,
    hasSubjectiveCheckIn,
  };

  let inserted = false;
  const updatedSessions: Session[] = [];
  for (const s of sessions) {
    if (!matchingIdSet.has(s.id)) {
      updatedSessions.push(s);
    } else if (!inserted) {
      updatedSessions.push(mergedSession);
      inserted = true;
    }
  }

  return {
    sessions: updatedSessions,
    consumptions: updatedConsumptions,
    activeSessionId: isActive ? surviving.id : activeSessionId,
    mergedSessionId: surviving.id,
  };
}
