import { calculateDangerLevel } from './dangerLevel';

describe('calculateDangerLevel (%T)', () => {
  it('should return 0 tension when everything is 0', () => {
    const result = calculateDangerLevel(0, 0.08, 0, 0, 10, 0, 3, 3, 3);
    expect(result.tensionPercent).toBe(0);
  });

  it('should calculate primary danger correctly', () => {
    // 0.04 / 0.08 = 50%
    const result = calculateDangerLevel(0.04, 0.08, 0.04, 0, 10, 0, 3, 3, 3);
    expect(result.tensionPercent).toBe(50);
  });

  it('should apply synergistic cross-fade correctly', () => {
    // BAC = 50% (0.04/0.08), THC = 20% (2/10)
    // Primary = 50, Secondary = 20. Total = 50 + (20 * 0.5) = 60
    const result = calculateDangerLevel(0.04, 0.08, 0.04, 2, 10, 2, 3, 3, 3);
    expect(result.tensionPercent).toBe(60);
  });

  it('should apply hunger modifier (+10 for hunger 4, +15 for hunger 5)', () => {
    // BAC = 50%, Hunger = 4
    let result = calculateDangerLevel(0.04, 0.08, 0.04, 0, 10, 0, 3, 4, 3);
    expect(result.tensionPercent).toBe(60); // 50 + 10

    // BAC = 50%, Hunger = 5
    result = calculateDangerLevel(0.04, 0.08, 0.04, 0, 10, 0, 3, 5, 3);
    expect(result.tensionPercent).toBe(65); // 50 + 15
  });

  it('should apply mood modifiers', () => {
    // Mood 1 or 5 = +15, Mood 2 = +5
    let result = calculateDangerLevel(0.02, 0.08, 0.02, 0, 10, 0, 1, 3, 3); // 25 + 15 = 40
    expect(result.tensionPercent).toBe(40);

    result = calculateDangerLevel(0.02, 0.08, 0.02, 0, 10, 0, 5, 3, 3); // 25 + 15 = 40
    expect(result.tensionPercent).toBe(40);

    result = calculateDangerLevel(0.02, 0.08, 0.02, 0, 10, 0, 2, 3, 3); // 25 + 5 = 30
    expect(result.tensionPercent).toBe(30);
  });

  it('should apply trailing decay when current is less than half of peak', () => {
    // peakBAC = 0.08 (100%), currentBAC = 0.02 (25%) -> less than half. Add 10.
    const result = calculateDangerLevel(0.02, 0.08, 0.08, 0, 10, 0, 3, 3, 3);
    // Base BAC = 25%. Trailing penalty = +10. Total = 35%
    expect(result.tensionPercent).toBe(35);
  });

  it('should not apply trailing decay when current is near peak', () => {
    // peakBAC = 0.08, currentBAC = 0.06 -> greater than half. No penalty.
    const result = calculateDangerLevel(0.06, 0.08, 0.08, 0, 10, 0, 3, 3, 3);
    // Base BAC = 75%.
    expect(result.tensionPercent).toBe(75);
  });

  it('should apply all modifiers concurrently', () => {
    // BAC = 50%, THC = 50%. Synergistic = 50 + 25 = 75%
    // Hunger 5 (+15%), Anxiety 4 (+5%). Total = 95%
    const result = calculateDangerLevel(0.04, 0.08, 0.04, 5, 10, 5, 3, 5, 4);
    expect(result.tensionPercent).toBe(95);
  });
});
