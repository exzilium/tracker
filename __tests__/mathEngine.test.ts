import { calculateBAC, calculateTHCEffect } from '../src/utils/mathEngine';

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

  it('never returns a negative BAC', () => {
    const bac = calculateBAC(12, 5, 150, 'male', 24); // 24 hours later
    expect(bac).toBe(0);
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
