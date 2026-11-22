import { Consumption, FavoriteItem } from '../store';
import {
  formatFavoriteSubtitle,
  formatStopwatch,
  getSessionPacingStats,
} from './pacingStats';

describe('formatStopwatch', () => {
  it('formats 0 elapsed seconds as 00:00', () => {
    expect(formatStopwatch(1000, 1000)).toBe('00:00');
  });

  it('clamps negative deltas to 00:00', () => {
    expect(formatStopwatch(5000, 1000)).toBe('00:00');
  });

  it('handles NaN timestamps safely', () => {
    expect(formatStopwatch(Number.NaN, 1000)).toBe('00:00');
    expect(formatStopwatch(1000, Number.NaN)).toBe('00:00');
  });

  it('formats sub-hour elapsed time as MM:SS', () => {
    expect(formatStopwatch(0, 95 * 1000)).toBe('01:35');
    expect(formatStopwatch(0, (59 * 60 + 59) * 1000)).toBe('59:59');
  });

  it('formats 1h+ elapsed time as H:MM:SS', () => {
    expect(formatStopwatch(0, 3665 * 1000)).toBe('1:01:05');
    expect(formatStopwatch(0, 2 * 3600 * 1000)).toBe('2:00:00');
  });
});

describe('getSessionPacingStats', () => {
  it('returns empty zeroed stats for an empty list', () => {
    expect(getSessionPacingStats([])).toEqual({
      totalStandardDrinks: 0,
      alcoholCount: 0,
      lastAlcohol: null,
      totalTHCMg: 0,
      thcCount: 0,
      lastTHC: null,
    });
  });

  it('calculates THC totals and latest dose independently', () => {
    const logs: Consumption[] = [
      {
        id: 't1',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy 1',
        method: 'edible',
        mg: 5,
        timestamp: 2000,
      },
      {
        id: 't2',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy 2',
        method: 'edible',
        mg: 2.5,
        timestamp: 1000,
      },
      {
        id: 't3',
        sessionId: 's1',
        type: 'thc',
        name: 'Puff',
        method: 'inhaled',
        mg: 2,
        timestamp: 3000,
      },
    ];

    const stats = getSessionPacingStats(logs);
    expect(stats.thcCount).toBe(3);
    expect(stats.totalTHCMg).toBe(9.5);
    expect(stats.lastTHC?.id).toBe('t3');
    expect(stats.alcoholCount).toBe(0);
    expect(stats.lastAlcohol).toBeNull();
  });

  it('calculates alcohol standard drinks and latest drink', () => {
    const logs: Consumption[] = [
      {
        id: 'a1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        timestamp: 5000,
      },
      {
        id: 'a2',
        sessionId: 's1',
        type: 'alcohol',
        name: 'IPA',
        volumeOz: 16,
        abvPercent: 7,
        timestamp: 1000,
      },
    ];

    const stats = getSessionPacingStats(logs);
    expect(stats.alcoholCount).toBe(2);
    expect(stats.totalStandardDrinks).toBe(2.9);
    expect(stats.lastAlcohol?.id).toBe('a1');
    expect(stats.thcCount).toBe(0);
    expect(stats.lastTHC).toBeNull();
  });

  it('tracks both alcohol and THC independently in mixed sessions', () => {
    const logs: Consumption[] = [
      {
        id: 'a1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Wine',
        volumeOz: 5,
        abvPercent: 12,
        timestamp: 2000,
      },
      {
        id: 't1',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 10,
        timestamp: 4000,
      },
    ];

    const stats = getSessionPacingStats(logs);
    expect(stats.alcoholCount).toBe(1);
    expect(stats.totalStandardDrinks).toBe(1);
    expect(stats.lastAlcohol?.id).toBe('a1');
    expect(stats.thcCount).toBe(1);
    expect(stats.totalTHCMg).toBe(10);
    expect(stats.lastTHC?.id).toBe('t1');
  });
});

describe('formatFavoriteSubtitle', () => {
  it('formats THC edible and inhaled subtitles', () => {
    const edible: FavoriteItem = {
      id: 'f1',
      type: 'thc',
      name: 'Gummy',
      method: 'edible',
      mg: 10,
    };
    const inhaled: FavoriteItem = {
      id: 'f2',
      type: 'thc',
      name: 'Puff',
      method: 'inhaled',
      mg: 2,
    };
    expect(formatFavoriteSubtitle(edible)).toBe('10mg · edible');
    expect(formatFavoriteSubtitle(inhaled)).toBe('2mg · inhaled');
  });

  it('formats alcohol oz and ABV subtitles', () => {
    const beer: FavoriteItem = {
      id: 'f3',
      type: 'alcohol',
      name: 'Beer',
      volumeOz: 12,
      abvPercent: 5,
    };
    expect(formatFavoriteSubtitle(beer)).toBe('12oz · 5%');
  });
});
