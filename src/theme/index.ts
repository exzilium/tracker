export const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  error: '#CF6679',
  warning: '#FFB74D',
  success: '#4CAF50',
  text: '#F0F0F2',
  textSecondary: '#B3B3B3',
};

export interface ConsumableColorOption {
  id: string;
  name: string;
  hex: string;
}

export const CONSUMABLE_COLORS: ConsumableColorOption[] = [
  { id: 'purple', name: 'Cosmic Purple', hex: '#BB86FC' }, // Alcohol default
  { id: 'teal', name: 'Nebula Teal', hex: '#03DAC6' }, // THC default
  { id: 'green', name: 'Emerald Leaf', hex: '#66BB6A' },
  { id: 'blue', name: 'Orbit Blue', hex: '#64B5F6' },
  { id: 'orange', name: 'Solar Amber', hex: '#FFB74D' },
  { id: 'red', name: 'Crimson Wine', hex: '#EF5350' },
  { id: 'pink', name: 'Starlight Rose', hex: '#F48FB1' },
  { id: 'gold', name: 'Lunar Gold', hex: '#FFD54F' },
];

export const typography = {
  fontFamily: 'System',
  h1: { fontSize: 32, fontWeight: 'bold' as const },
  h2: { fontSize: 24, fontWeight: 'bold' as const },
  body: { fontSize: 16 },
  caption: { fontSize: 12 },
};
