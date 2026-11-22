import type { ConsumableType, Consumption } from '../store';
import { colors } from '../theme';

export const LEGACY_STOCK_NAME_MAP: Record<string, string> = {
  'Wine (5oz, 12%)': 'Wine',
  'Standard Drink (12oz, 5%)': 'Beer',
  'Standard Joint (10mg)': 'Joint',
  '1 Puff (2mg)': 'Puff',
  'Puff (2mg)': 'Puff',
  'Gummy (10mg)': 'Gummy',
  'Gummy (5mg)': 'Gummy',
  'Gummy (2.5mg)': 'Gummy',
};

/**
 * Strips hardcoded dose suffixes from exact stock preset/favorite names while
 * leaving any user-entered or custom brand names completely untouched.
 */
export function normalizeLegacyConsumableName(name: string): string {
  const trimmed = name.trim();
  return LEGACY_STOCK_NAME_MAP[trimmed] ?? name;
}

/**
 * Validates that a value is a 6-digit hex color string (e.g. #BB86FC).
 */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Resolves the display accent color for a consumable or favorite item, falling
 * back to the substance-type default when no valid custom color is set.
 */
export function getConsumableColor(item: { type: ConsumableType; color?: string }): string {
  if (isValidHexColor(item.color)) {
    return item.color;
  }
  return item.type === 'thc' ? colors.secondary : colors.primary;
}

/**
 * Converts a 6-digit hex color into an rgba() string with the requested alpha.
 */
export function withAlpha(hex: string, alpha: number): string {
  const safeAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  if (!isValidHexColor(hex)) {
    return `rgba(255, 255, 255, ${safeAlpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

/**
 * Builds a concise metadata subtitle for consumable cards and log rows
 * (e.g. "10mg · edible" or "12oz · 5%").
 */
export function formatConsumableSubtitle(
  item: Pick<Consumption, 'type' | 'mg' | 'method' | 'volumeOz' | 'abvPercent'>
): string {
  if (item.type === 'thc') {
    if (typeof item.mg === 'number' && Number.isFinite(item.mg) && item.mg > 0) {
      const mgStr = `${Number(item.mg.toFixed(1))}mg`;
      if (item.method === 'inhaled' || item.method === 'edible') {
        return `${mgStr} · ${item.method}`;
      }
      return mgStr;
    }
    return item.method || '';
  }

  if (
    typeof item.volumeOz === 'number' &&
    Number.isFinite(item.volumeOz) &&
    item.volumeOz > 0 &&
    typeof item.abvPercent === 'number' &&
    Number.isFinite(item.abvPercent) &&
    item.abvPercent > 0
  ) {
    return `${Number(item.volumeOz.toFixed(1))}oz · ${Number(item.abvPercent.toFixed(1))}%`;
  }

  return '';
}

/**
 * Builds a compact dose string (omitting method) for tight single-line labels
 * such as PacingBar.
 */
export function formatConsumableCompactDose(
  item: Pick<Consumption, 'type' | 'mg' | 'volumeOz' | 'abvPercent'>
): string {
  if (item.type === 'thc') {
    if (typeof item.mg === 'number' && Number.isFinite(item.mg) && item.mg > 0) {
      return `${Number(item.mg.toFixed(1))}mg`;
    }
    return '';
  }

  if (
    typeof item.volumeOz === 'number' &&
    Number.isFinite(item.volumeOz) &&
    item.volumeOz > 0 &&
    typeof item.abvPercent === 'number' &&
    Number.isFinite(item.abvPercent) &&
    item.abvPercent > 0
  ) {
    return `${Number(item.volumeOz.toFixed(1))}oz · ${Number(item.abvPercent.toFixed(1))}%`;
  }

  return '';
}
