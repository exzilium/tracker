import { colors } from '../theme';
import {
  formatConsumableCompactDose,
  formatConsumableSubtitle,
  getConsumableColor,
  isValidHexColor,
  normalizeLegacyConsumableName,
  withAlpha,
} from './consumableMeta';

describe('consumableMeta', () => {
  it('strips dose metadata from exact legacy stock names', () => {
    expect(normalizeLegacyConsumableName('Wine (5oz, 12%)')).toBe('Wine');
    expect(normalizeLegacyConsumableName('Standard Drink (12oz, 5%)')).toBe('Beer');
    expect(normalizeLegacyConsumableName('Standard Joint (10mg)')).toBe('Joint');
    expect(normalizeLegacyConsumableName('1 Puff (2mg)')).toBe('Puff');
    expect(normalizeLegacyConsumableName('Puff (2mg)')).toBe('Puff');
    expect(normalizeLegacyConsumableName('Gummy (10mg)')).toBe('Gummy');
    expect(normalizeLegacyConsumableName('Gummy (5mg)')).toBe('Gummy');
    expect(normalizeLegacyConsumableName('Gummy (2.5mg)')).toBe('Gummy');
  });

  it('preserves user-defined brand names and custom parenthetical labels', () => {
    expect(normalizeLegacyConsumableName('Wana Sativa Gummy')).toBe('Wana Sativa Gummy');
    expect(normalizeLegacyConsumableName('Wana (10mg)')).toBe('Wana (10mg)');
    expect(normalizeLegacyConsumableName('House IPA (16oz)')).toBe('House IPA (16oz)');
    expect(normalizeLegacyConsumableName('Kiva Camino Sparkling Pear')).toBe(
      'Kiva Camino Sparkling Pear'
    );
  });

  it('validates hex colors and resolves defaults vs custom colors', () => {
    expect(isValidHexColor('#BB86FC')).toBe(true);
    expect(isValidHexColor('#ef5350')).toBe(true);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('#FFF')).toBe(false);

    expect(getConsumableColor({ type: 'alcohol' })).toBe(colors.primary);
    expect(getConsumableColor({ type: 'thc' })).toBe(colors.secondary);
    expect(getConsumableColor({ type: 'alcohol', color: '#EF5350' })).toBe('#EF5350');
    expect(getConsumableColor({ type: 'thc', color: 'invalid' })).toBe(colors.secondary);
  });

  it('formats rgba alpha helpers safely', () => {
    expect(withAlpha('#BB86FC', 0.12)).toBe('rgba(187, 134, 252, 0.12)');
    expect(withAlpha('bad-hex', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
  });

  it('formats full subtitles and compact dose labels for both alcohol and THC', () => {
    expect(
      formatConsumableSubtitle({
        type: 'thc',
        mg: 5,
        method: 'edible',
      })
    ).toBe('5mg · edible');

    expect(
      formatConsumableSubtitle({
        type: 'alcohol',
        volumeOz: 5,
        abvPercent: 12,
      })
    ).toBe('5oz · 12%');

    expect(
      formatConsumableCompactDose({
        type: 'thc',
        mg: 5,
      })
    ).toBe('5mg');

    expect(
      formatConsumableCompactDose({
        type: 'alcohol',
        volumeOz: 12,
        abvPercent: 5,
      })
    ).toBe('12oz · 5%');
  });
});
