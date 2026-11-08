import { calculateBAC, calculateTHCEffect, calculateStandardDrinks } from '../src/utils/mathEngine';
import { getCurrentLevels, getPeaks } from '../src/utils/currentLevels';
import { Consumption, UserProfile } from '../src/store';

describe('Math Engine - Widmark Formula (BAC)', () => {
  it('calculates 0 BAC when no alcohol is consumed', () => {
    const bac = calculateBAC(0, 0, 150, 'male', 1);
    expect(bac).toBe(0);
  });

  it('calculates expected BAC for a 150lb male after 2 standard drinks immediately', () => {
    // 2 standard drinks ~ 12oz of 5% each = 24oz
    const bac = calculateBAC(24, 5, 150, 'male', 0);
    // Estimated: ~0.06
    expect(bac).toBeGreaterThan(0.05);
    expect(bac).toBeLessThan(0.08);
  });

  it('calculates lower BAC for heavier individuals given the same alcohol', () => {
    const lightBac = calculateBAC(24, 5, 150, 'male', 0);
    const heavyBac = calculateBAC(24, 5, 250, 'male', 0);
    expect(heavyBac).toBeLessThan(lightBac);
  });

  it('accounts for metabolic burn rate over time', () => {
    const immediateBac = calculateBAC(24, 5, 150, 'male', 0);
    const after2HoursBac = calculateBAC(24, 5, 150, 'male', 2);
    expect(after2HoursBac).toBeLessThan(immediateBac);
    // Burn rate is ~0.015 per hour, so it should be ~0.030 less
    expect(after2HoursBac).toBeCloseTo(immediateBac - 0.03, 2);
  });

  it('distributes alcohol absorption over durationMins', () => {
    const fullBac = calculateBAC(12, 5, 150, 'male', 0, 0);
    const halfAbsorbedBac = calculateBAC(12, 5, 150, 'male', 0.5, 60); // 30 mins into a 60 min drink
    expect(halfAbsorbedBac).toBeCloseTo(fullBac * 0.5 - 0.0075, 4);
  });

  it('never returns a negative BAC or NaN for invalid inputs', () => {
    expect(calculateBAC(12, 5, 150, 'male', 24)).toBe(0);
    expect(calculateBAC(-12, 5, 150, 'male', 0)).toBe(0);
    expect(calculateBAC(12, -5, 150, 'male', 0)).toBe(0);
    expect(calculateBAC(NaN, 5, 150, 'male', 0)).toBe(0);
    expect(calculateStandardDrinks(-12, 5)).toBe(0);
    expect(calculateStandardDrinks(12, 5)).toBe(1);
  });
});

describe('Current Levels - Multi-Drink Pool Integration & Metric Units', () => {
  const baseProfile: UserProfile = {
    height: 70,
    weight: 160,
    gender: 'male',
    units: 'imperial',
    isOnboarded: true,
    maxBAC: 0.08,
    maxTHC: 10,
  };

  it('applies a single 0.015/hr metabolic burn rate across multiple concurrent drinks', () => {
    const t0 = 1_700_000_000_000;
    const tAfter1Hr = t0 + 60 * 60 * 1000;

    // 4 standard drinks (4 x 12oz @ 5% = 48oz total) vs 1 combined 48oz drink @ 5%
    const fourDrinks: Consumption[] = [1, 2, 3, 4].map((i) => ({
      id: `d-${i}`,
      sessionId: 's1',
      type: 'alcohol',
      name: 'Beer',
      timestamp: t0,
      volumeOz: 12,
      abvPercent: 5,
      durationMins: 0,
    }));

    const singleCombinedDrink: Consumption[] = [
      {
        id: 'd-combined',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Pitcher',
        timestamp: t0,
        volumeOz: 48,
        abvPercent: 5,
        durationMins: 0,
      },
    ];

    const multiResult = getCurrentLevels(fourDrinks, baseProfile, tAfter1Hr);
    const singleResult = getCurrentLevels(singleCombinedDrink, baseProfile, tAfter1Hr);

    // 4 separate 12oz drinks at t0 must have the exact same BAC after 1 hour as 1 48oz drink
    expect(multiResult.currentBAC).toBeCloseTo(singleResult.currentBAC, 5);
    expect(multiResult.currentBAC).toBeGreaterThan(0.08);
  });

  it('converts metric weight (kg) to lbs accurately for BAC calculations', () => {
    const t0 = 1_700_000_000_000;
    const imperialProfile: UserProfile = { ...baseProfile, weight: 154.3236, units: 'imperial' };
    const metricProfile: UserProfile = { ...baseProfile, weight: 70, units: 'metric' }; // 70kg ~= 154.3236 lbs

    const logs: Consumption[] = [
      {
        id: 'd1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Wine',
        timestamp: t0,
        volumeOz: 5,
        abvPercent: 12,
        durationMins: 0,
      },
    ];

    const impBac = getCurrentLevels(logs, imperialProfile, t0).currentBAC;
    const metBac = getCurrentLevels(logs, metricProfile, t0).currentBAC;

    expect(metBac).toBeCloseTo(impBac, 4);

    const impPeaks = getPeaks(logs, imperialProfile, t0);
    const metPeaks = getPeaks(logs, metricProfile, t0);
    expect(metPeaks.peakBAC).toBeCloseTo(impPeaks.peakBAC, 4);
  });

  it('captures exact BAC and THC peaks at off-grid vertex timestamps (e.g., +2.5 mins)', () => {
    const t0 = 1_700_000_000_000;
    const tOffset = t0 + 2.5 * 60 * 1000; // +2.5 minutes (between 0m and 5m grid ticks)

    const logs: Consumption[] = [
      {
        id: 'd1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Beer',
        timestamp: t0,
        volumeOz: 12,
        abvPercent: 5,
        durationMins: 45,
      },
      {
        id: 't1',
        sessionId: 's1',
        type: 'thc',
        name: 'Joint',
        timestamp: tOffset,
        method: 'inhaled',
        mg: 10,
      },
    ];

    const peaks = getPeaks(logs, baseProfile, t0);
    // Inhaled 10mg THC at tOffset must peak at exactly 10.0mg at tOffset + 20 mins
    expect(peaks.peakTHC).toBeCloseTo(10.0, 5);
    expect(peaks.peakTHCTime).toBe(tOffset + 20 * 60 * 1000);
  });
});

describe('Math Engine - THC Pharmacokinetics', () => {
  it('inhaled THC peaks quickly and burns down over 3 hours', () => {
    expect(calculateTHCEffect('inhaled', 0)).toBe(0);
    expect(calculateTHCEffect('inhaled', 20)).toBe(1.0); // Peak
    expect(calculateTHCEffect('inhaled', 60)).toBeLessThan(1.0);
    expect(calculateTHCEffect('inhaled', 181)).toBe(0);
  });

  it('edible THC peaks slowly and burns down over 8 hours', () => {
    expect(calculateTHCEffect('edible', 30)).toBeLessThan(0.5);
    expect(calculateTHCEffect('edible', 120)).toBe(1.0); // Peak
    expect(calculateTHCEffect('edible', 240)).toBeLessThan(1.0);
    expect(calculateTHCEffect('edible', 481)).toBe(0);
  });
});
