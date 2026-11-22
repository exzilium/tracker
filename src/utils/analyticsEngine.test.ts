import type { Consumption, Session, UserProfile } from '../store';
import {
  computePeriodAnalytics,
  getCombinedSpanForConsumptions,
  getPeriodWindow,
} from './analyticsEngine';

const PROFILE: UserProfile = {
  height: 70,
  weight: 180,
  gender: 'male',
  units: 'imperial',
  isOnboarded: true,
  maxBAC: 0.08,
  maxTHC: 10,
};

describe('analyticsEngine', () => {
  const fixedNow = new Date(2026, 10, 22, 15, 0, 0).getTime(); // Nov 22, 2026 3:00 PM

  it('computes 7d, 30d, 1y, and all period windows with offset stepping', () => {
    const week0 = getPeriodWindow('7d', 0, fixedNow);
    const weekPrev = getPeriodWindow('7d', -1, fixedNow);
    expect(week0.canGoNext).toBe(false);
    expect(weekPrev.canGoNext).toBe(true);
    expect(weekPrev.endTime).toBeLessThan(week0.startTime);

    const month0 = getPeriodWindow('30d', 0, fixedNow);
    const monthPrev = getPeriodWindow('30d', -1, fixedNow);
    expect(new Date(month0.startTime).getMonth()).toBe(10); // Nov
    expect(new Date(monthPrev.startTime).getMonth()).toBe(9); // Oct

    const year0 = getPeriodWindow('1y', 0, fixedNow);
    expect(year0.label).toBe('2026');

    const all = getPeriodWindow('all', 0, fixedNow, new Date(2026, 5, 1).getTime());
    expect(all.label).toBe('All Time');
    expect(all.canGoNext).toBe(false);
  });

  it('aggregates drinks, THC split, calories, vibe averages, and top consumables', () => {
    const s1Time = new Date(2026, 10, 20, 20, 0, 0).getTime();
    const s2Time = new Date(2026, 10, 21, 19, 0, 0).getTime();
    const lastMonthTime = new Date(2026, 9, 10, 20, 0, 0).getTime();

    const sessions: Session[] = [
      {
        id: 's1',
        startTime: s1Time,
        endTime: s1Time + 2 * 60 * 60 * 1000,
        mood: 4,
        hunger: 3,
        anxiety: 2,
        hasSubjectiveCheckIn: true,
      },
      {
        id: 's2',
        startTime: s2Time,
        endTime: s2Time + 60 * 60 * 1000,
        mood: 3,
        hunger: 3,
        anxiety: 3,
        hasSubjectiveCheckIn: false, // Quick Start without explicit check-in
      },
      {
        id: 's-old',
        startTime: lastMonthTime,
        endTime: lastMonthTime + 60 * 60 * 1000,
        mood: 1,
        hunger: 5,
        anxiety: 5,
        hasSubjectiveCheckIn: true,
      },
    ];

    const consumptions: Consumption[] = [
      {
        id: 'c1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Wine',
        color: '#EF5350',
        volumeOz: 5,
        abvPercent: 12,
        durationMins: 45,
        calories: 125,
        timestamp: s1Time,
      },
      {
        id: 'c2',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy',
        color: '#66BB6A',
        method: 'edible',
        mg: 5,
        calories: 10,
        timestamp: s1Time + 15 * 60 * 1000,
      },
      {
        id: 'c3',
        sessionId: 's2',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 5,
        calories: 10,
        timestamp: s2Time,
      },
      {
        id: 'c4',
        sessionId: 's2',
        type: 'thc',
        name: 'Puff',
        method: 'inhaled',
        mg: 2,
        timestamp: s2Time + 10 * 60 * 1000,
      },
      {
        id: 'c-old',
        sessionId: 's-old',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        calories: 150,
        timestamp: lastMonthTime,
      },
    ];

    const novAnalytics = computePeriodAnalytics(
      sessions,
      consumptions,
      PROFILE,
      '30d',
      0,
      fixedNow
    );

    expect(novAnalytics.sessionCount).toBe(2);
    expect(novAnalytics.totalItems).toBe(4);
    expect(novAnalytics.totalStandardDrinks).toBe(1);
    expect(novAnalytics.totalTHCMg).toBe(12);
    expect(novAnalytics.edibleTHCMg).toBe(10);
    expect(novAnalytics.inhaledTHCMg).toBe(2);
    expect(novAnalytics.totalCalories).toBe(145);
    // Quick Start session s2 (3/3/3, hasSubjectiveCheckIn: false) must be excluded
    expect(novAnalytics.checkInCount).toBe(1);
    expect(novAnalytics.avgMood).toBe(4);
    expect(novAnalytics.avgAnxiety).toBe(2);

    expect(novAnalytics.topConsumables[0].name).toBe('Gummy');
    expect(novAnalytics.topConsumables[0].count).toBe(2);
    expect(novAnalytics.topConsumables[0].color).toBe('#66BB6A');
    expect(novAnalytics.buckets.length).toBeGreaterThanOrEqual(4);

    // Stepping back -1 month captures s-old
    const octAnalytics = computePeriodAnalytics(
      sessions,
      consumptions,
      PROFILE,
      '30d',
      -1,
      fixedNow
    );
    expect(octAnalytics.sessionCount).toBe(1);
    expect(octAnalytics.totalStandardDrinks).toBe(1);
    expect(octAnalytics.totalCalories).toBe(150);
  });

  it('builds a bounded projection span for multiple overlapping logs', () => {
    const t0 = new Date(2026, 10, 21, 18, 0, 0).getTime();
    const span = getCombinedSpanForConsumptions([
      {
        id: 'a',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        timestamp: t0,
      },
      {
        id: 'b',
        sessionId: 's2',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 5,
        timestamp: t0 + 90 * 60 * 1000,
      },
    ]);

    expect(span).not.toBeNull();
    expect(span!.consumptions).toHaveLength(2);
    expect(span!.fixedTimeWindowHours).toBeGreaterThanOrEqual(4);
    expect(span!.fixedTimeWindowHours).toBeLessThanOrEqual(24);
  });
});
