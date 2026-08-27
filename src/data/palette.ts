// Habit colors: a small set that sits well next to the brand's magenta↔violet
// gradient on both the dark and the light canvas. Hex is used directly in SVG.
export interface HabitColor {
  id: string;
  label: string;
  hex: string;
}

export const PALETTE: HabitColor[] = [
  { id: 'pink', label: 'Pink', hex: '#f49ad4' },
  { id: 'violet', label: 'Violet', hex: '#b285f2' },
  { id: 'magenta', label: 'Magenta', hex: '#d64ba6' },
  { id: 'sky', label: 'Sky', hex: '#7ab8f5' },
  { id: 'teal', label: 'Teal', hex: '#5fcfc0' },
  { id: 'lime', label: 'Lime', hex: '#b5e07a' },
  { id: 'amber', label: 'Amber', hex: '#f2c14e' },
  { id: 'coral', label: 'Coral', hex: '#f47a7a' },
];

export const DEFAULT_COLOR = PALETTE[0].id;

export function colorHex(id: string): string {
  return PALETTE.find((c) => c.id === id)?.hex ?? PALETTE[0].hex;
}
