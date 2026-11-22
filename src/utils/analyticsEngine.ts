import type { ConsumableType, Consumption, Session, UserProfile } from '../store';
import { calculateStandardDrinks } from './mathEngine';
import { getPeaks } from './currentLevels';
import { isValidHexColor } from './consumableMeta';

export type AnalyticsTimeSlice = '7d' | '30d' | '1y' | 'all';

export interface PeriodWindow {
  startTime: number;
  endTime: number;
  label: string;
  canGoNext: boolean;
}

export interface AnalyticsBucket {
  key: string;
  label: string;
  startTime: number;
  endTime: number;
  drinks: number;
  thcMg: number;
  calories: number;
  peakBAC: number;
  peakTHC: number;
  sessionCount: number;
  consumptions: Consumption[];
}

export interface TopConsumableStat {
  key: string;
  type: ConsumableType;
  name: string;
  emoji?: string;
  color?: string;
  count: number;
  totalDrinks: number;
  totalTHCMg: number;
  totalCalories: number;
}

export interface PeriodAnalytics {
  window: PeriodWindow;
  sessions: Session[];
  consumptions: Consumption[];
  sessionCount: number;
  totalItems: number;
  totalStandardDrinks: number;
  totalTHCMg: number;
  edibleTHCMg: number;
  inhaledTHCMg: number;
  totalCalories: number;
  avgPeakBAC: number;
  maxPeakBAC: number;
  bacLimitCrossings: number;
  avgPeakTHC: number;
  maxPeakTHC: number;
  thcLimitCrossings: number;
  checkInCount: number;
  avgMood: number | null;
  avgHunger: number | null;
  avgAnxiety: number | null;
  buckets: AnalyticsBucket[];
  topConsumables: TopConsumableStat[];
}

export interface CombinedProjectionSpan {
  startTime: number;
  fixedTimeWindowHours: number;
  consumptions: Consumption[];
  label: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfLocalDay = (ts: number): number => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
};

const endOfLocalDay = (ts: number): number => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
};

/**
 * Computes the calendar bounds and human-readable label for a time slice
 * (`7d`, `30d`, `1y`, `all`) shifted by `periodOffset` (0 = current period).
 */
export function getPeriodWindow(
  slice: AnalyticsTimeSlice,
  periodOffset = 0,
  now = Date.now(),
  earliestDataTs?: number
): PeriodWindow {
  const safeOffset = Math.min(0, Math.trunc(periodOffset));
  const nowDate = new Date(now);

  if (slice === '7d') {
    const endDate = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate() + safeOffset * 7,
      23,
      59,
      59,
      999
    );
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() - 6,
      0,
      0,
      0,
      0
    );
    const includeYear = startDate.getFullYear() !== nowDate.getFullYear();
    const fmt = (d: Date) =>
      `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}${includeYear ? `, ${d.getFullYear()}` : ''}`;

    return {
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      label: `${fmt(startDate)} – ${fmt(endDate)}`,
      canGoNext: safeOffset < 0,
    };
  }

  if (slice === '30d') {
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() + safeOffset, 1, 0, 0, 0, 0);
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const label = monthStart.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
    return {
      startTime: monthStart.getTime(),
      endTime: monthEnd.getTime(),
      label,
      canGoNext: safeOffset < 0,
    };
  }

  if (slice === '1y') {
    const year = nowDate.getFullYear() + safeOffset;
    const startTime = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const endTime = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    return {
      startTime,
      endTime,
      label: String(year),
      canGoNext: safeOffset < 0,
    };
  }

  const startTime =
    typeof earliestDataTs === 'number' && Number.isFinite(earliestDataTs)
      ? startOfLocalDay(Math.min(earliestDataTs, now))
      : startOfLocalDay(now - 30 * 24 * 60 * 60 * 1000);

  return {
    startTime,
    endTime: endOfLocalDay(now),
    label: 'All Time',
    canGoNext: false,
  };
}

function buildBucketTemplates(
  slice: AnalyticsTimeSlice,
  window: PeriodWindow
): Array<{ key: string; label: string; startTime: number; endTime: number }> {
  if (slice === '7d') {
    const start = new Date(window.startTime);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 0, 0, 0, 0);
      const e = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 23, 59, 59, 999);
      out.push({
        key: `day-${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`,
        label: DAY_SHORT[s.getDay()],
        startTime: s.getTime(),
        endTime: e.getTime(),
      });
    }
    return out;
  }

  if (slice === '30d') {
    const start = new Date(window.startTime);
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let day = 1; day <= daysInMonth; day += 7) {
      const endDay = Math.min(daysInMonth, day + 6);
      const s = new Date(year, month, day, 0, 0, 0, 0).getTime();
      const e = new Date(year, month, endDay, 23, 59, 59, 999).getTime();
      out.push({
        key: `wk-${year}-${month}-${day}`,
        label: `${day}-${endDay}`,
        startTime: s,
        endTime: e,
      });
    }
    return out;
  }

  if (slice === '1y') {
    const year = new Date(window.startTime).getFullYear();
    const out = [];
    for (let m = 0; m < 12; m++) {
      const s = new Date(year, m, 1, 0, 0, 0, 0).getTime();
      const e = new Date(year, m + 1, 0, 23, 59, 59, 999).getTime();
      out.push({
        key: `mo-${year}-${m}`,
        label: MONTH_SHORT[m],
        startTime: s,
        endTime: e,
      });
    }
    return out;
  }

  // 'all': generate monthly buckets from startTime to endTime, coalesced if > 12 months
  const sDate = new Date(window.startTime);
  const eDate = new Date(window.endTime);
  const months: Array<{ key: string; label: string; startTime: number; endTime: number }> = [];
  let y = sDate.getFullYear();
  let m = sDate.getMonth();
  while (y < eDate.getFullYear() || (y === eDate.getFullYear() && m <= eDate.getMonth())) {
    const s = new Date(y, m, 1, 0, 0, 0, 0).getTime();
    const e = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
    months.push({
      key: `all-${y}-${m}`,
      label: `${MONTH_SHORT[m]} '${String(y).slice(-2)}`,
      startTime: s,
      endTime: e,
    });
    m += 1;
    if (m >= 12) {
      m = 0;
      y += 1;
    }
  }

  if (months.length <= 12) return months;

  const groupSize = Math.ceil(months.length / 12);
  const grouped = [];
  for (let i = 0; i < months.length; i += groupSize) {
    const sliceGroup = months.slice(i, i + groupSize);
    grouped.push({
      key: `${sliceGroup[0].key}-${sliceGroup[sliceGroup.length - 1].key}`,
      label: sliceGroup[0].label,
      startTime: sliceGroup[0].startTime,
      endTime: sliceGroup[sliceGroup.length - 1].endTime,
    });
  }
  return grouped;
}

/**
 * Aggregates sessions, intakes, peak levels, vibe ratings, chart buckets,
 * and top consumables for the selected time window.
 */
export function computePeriodAnalytics(
  sessions: Session[],
  consumptions: Consumption[],
  profile: UserProfile,
  slice: AnalyticsTimeSlice,
  periodOffset = 0,
  now = Date.now()
): PeriodAnalytics {
  const candidateTimes = [
    ...sessions.map((s) => s.startTime),
    ...consumptions.map((c) => c.timestamp),
  ].filter((t) => Number.isFinite(t) && t > 0);
  const earliestDataTs = candidateTimes.length > 0 ? Math.min(...candidateTimes) : undefined;

  const window = getPeriodWindow(slice, periodOffset, now, earliestDataTs);

  const periodSessions = sessions
    .filter((s) => {
      const sEnd = s.endTime ?? now;
      return s.startTime <= window.endTime && sEnd >= window.startTime;
    })
    .sort((a, b) => b.startTime - a.startTime);

  const periodConsumptions = consumptions
    .filter(
      (c) =>
        Number.isFinite(c.timestamp) &&
        c.timestamp >= window.startTime &&
        c.timestamp <= window.endTime
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  let totalDrinks = 0;
  let totalTHCMg = 0;
  let edibleTHCMg = 0;
  let inhaledTHCMg = 0;
  let totalCalories = 0;

  for (const c of periodConsumptions) {
    if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
      totalDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
    } else if (c.type === 'thc' && c.mg) {
      totalTHCMg += c.mg;
      if (c.method === 'inhaled') {
        inhaledTHCMg += c.mg;
      } else {
        edibleTHCMg += c.mg;
      }
    }
    if (typeof c.calories === 'number' && Number.isFinite(c.calories) && c.calories > 0) {
      totalCalories += c.calories;
    }
  }

  const bySession = new Map<string, Consumption[]>();
  for (const c of consumptions) {
    const existing = bySession.get(c.sessionId);
    if (existing) existing.push(c);
    else bySession.set(c.sessionId, [c]);
  }

  const limitBAC = profile.maxBAC || 0.08;
  const limitTHC = profile.maxTHC || 10;

  let peakBACSum = 0;
  let maxPeakBAC = 0;
  let bacLimitCrossings = 0;
  let peakTHCSum = 0;
  let maxPeakTHC = 0;
  let thcLimitCrossings = 0;

  let checkInCount = 0;
  let moodSum = 0;
  let hungerSum = 0;
  let anxietySum = 0;

  for (const s of periodSessions) {
    const sLogs = bySession.get(s.id) || [];
    if (sLogs.length > 0) {
      const peaks = getPeaks(sLogs, profile, s.endTime ?? now);
      peakBACSum += peaks.peakBAC;
      peakTHCSum += peaks.peakTHC;
      if (peaks.peakBAC > maxPeakBAC) maxPeakBAC = peaks.peakBAC;
      if (peaks.peakTHC > maxPeakTHC) maxPeakTHC = peaks.peakTHC;
      if (peaks.peakBAC > limitBAC) bacLimitCrossings += 1;
      if (peaks.peakTHC > limitTHC) thcLimitCrossings += 1;
    }

    if (s.hasSubjectiveCheckIn !== false) {
      checkInCount += 1;
      moodSum += s.mood;
      hungerSum += s.hunger;
      anxietySum += s.anxiety;
    }
  }

  const sessionCount = periodSessions.length;

  const templates = buildBucketTemplates(slice, window);
  const buckets: AnalyticsBucket[] = templates.map((tpl) => {
    const bucketLogs = periodConsumptions.filter(
      (c) => c.timestamp >= tpl.startTime && c.timestamp <= tpl.endTime
    );
    const bucketSessionsCount = periodSessions.filter((s) => {
      const sEnd = s.endTime ?? now;
      return s.startTime <= tpl.endTime && sEnd >= tpl.startTime;
    }).length;

    let bDrinks = 0;
    let bTHC = 0;
    let bCals = 0;
    for (const c of bucketLogs) {
      if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
        bDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
      } else if (c.type === 'thc' && c.mg) {
        bTHC += c.mg;
      }
      if (typeof c.calories === 'number' && Number.isFinite(c.calories) && c.calories > 0) {
        bCals += c.calories;
      }
    }

    let bPeakBAC = 0;
    let bPeakTHC = 0;
    if (bucketLogs.length > 0) {
      const refEnd = Math.min(tpl.endTime, bucketLogs[0].timestamp + 8 * 60 * 60 * 1000);
      const peaks = getPeaks(bucketLogs, profile, refEnd);
      bPeakBAC = peaks.peakBAC;
      bPeakTHC = peaks.peakTHC;
    }

    return {
      key: tpl.key,
      label: tpl.label,
      startTime: tpl.startTime,
      endTime: tpl.endTime,
      drinks: Number(bDrinks.toFixed(1)),
      thcMg: Number(bTHC.toFixed(1)),
      calories: Math.round(bCals),
      peakBAC: Number(bPeakBAC.toFixed(3)),
      peakTHC: Number(bPeakTHC.toFixed(1)),
      sessionCount: bucketSessionsCount,
      consumptions: bucketLogs,
    };
  });

  const consumableMap = new Map<string, TopConsumableStat>();
  for (const c of periodConsumptions) {
    const normKey = `${c.type}:${c.name.trim().toLowerCase()}`;
    const existing = consumableMap.get(normKey);
    const drinks =
      c.type === 'alcohol' && c.volumeOz && c.abvPercent
        ? calculateStandardDrinks(c.volumeOz, c.abvPercent)
        : 0;
    const mg = c.type === 'thc' && c.mg ? c.mg : 0;
    const cals = c.calories || 0;

    if (existing) {
      existing.count += 1;
      existing.totalDrinks = Number((existing.totalDrinks + drinks).toFixed(1));
      existing.totalTHCMg = Number((existing.totalTHCMg + mg).toFixed(1));
      existing.totalCalories += cals;
      if (!existing.emoji && c.emoji) existing.emoji = c.emoji;
      if (!existing.color && isValidHexColor(c.color)) existing.color = c.color;
    } else {
      consumableMap.set(normKey, {
        key: normKey,
        type: c.type,
        name: c.name.trim(),
        emoji: c.emoji,
        color: isValidHexColor(c.color) ? c.color : undefined,
        count: 1,
        totalDrinks: Number(drinks.toFixed(1)),
        totalTHCMg: Number(mg.toFixed(1)),
        totalCalories: cals,
      });
    }
  }

  const topConsumables = Array.from(consumableMap.values()).sort(
    (a, b) =>
      b.count - a.count ||
      b.totalDrinks + b.totalTHCMg - (a.totalDrinks + a.totalTHCMg)
  );

  return {
    window,
    sessions: periodSessions,
    consumptions: periodConsumptions,
    sessionCount,
    totalItems: periodConsumptions.length,
    totalStandardDrinks: Number(totalDrinks.toFixed(1)),
    totalTHCMg: Number(totalTHCMg.toFixed(1)),
    edibleTHCMg: Number(edibleTHCMg.toFixed(1)),
    inhaledTHCMg: Number(inhaledTHCMg.toFixed(1)),
    totalCalories: Math.round(totalCalories),
    avgPeakBAC: sessionCount > 0 ? Number((peakBACSum / sessionCount).toFixed(3)) : 0,
    maxPeakBAC: Number(maxPeakBAC.toFixed(3)),
    bacLimitCrossings,
    avgPeakTHC: sessionCount > 0 ? Number((peakTHCSum / sessionCount).toFixed(1)) : 0,
    maxPeakTHC: Number(maxPeakTHC.toFixed(1)),
    thcLimitCrossings,
    checkInCount,
    avgMood: checkInCount > 0 ? Number((moodSum / checkInCount).toFixed(1)) : null,
    avgHunger: checkInCount > 0 ? Number((hungerSum / checkInCount).toFixed(1)) : null,
    avgAnxiety: checkInCount > 0 ? Number((anxietySum / checkInCount).toFixed(1)) : null,
    buckets,
    topConsumables,
  };
}

/**
 * Extracts a continuous up-to-24h projection window around the latest active day
 * within the provided consumptions so multi-session spans plot cleanly on BurndownChart.
 */
export function getCombinedSpanForConsumptions(
  consumptions: Consumption[]
): CombinedProjectionSpan | null {
  const valid = consumptions
    .filter((c) => Number.isFinite(c.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (valid.length === 0) return null;

  const latestTs = valid[valid.length - 1].timestamp;
  const spanCutoff = latestTs - 16 * 60 * 60 * 1000;
  const spanLogs = valid.filter((c) => c.timestamp >= spanCutoff);
  const earliestTs = spanLogs[0].timestamp;
  const startTime = earliestTs - 30 * 60 * 1000;

  let maxOffsetHours = Math.ceil((latestTs - startTime) / (60 * 60 * 1000)) + 8;
  maxOffsetHours = Math.max(4, Math.min(24, maxOffsetHours));

  const dateLabel = new Date(earliestTs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return {
    startTime,
    fixedTimeWindowHours: maxOffsetHours,
    consumptions: spanLogs,
    label: `${dateLabel} · ${spanLogs.length} ${spanLogs.length === 1 ? 'item' : 'items'}`,
  };
}
