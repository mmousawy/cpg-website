/**
 * Color palette and CSS mappings for the Color Photography Challenge.
 * Standard colors + wildcards (pastel, neon, metallic, earth tones).
 */

export const COLOR_PALETTE = [
  'red',
  'blue',
  'yellow',
  'green',
  'orange',
  'purple',
  'pink',
  'brown',
  'white',
  'black',
  'teal',
  'gold',
  'coral',
  'navy',
  'lime',
  'gray',
  'pastel',
  'neon',
  'metallic',
  'earth tones',
] as const;

export type ColorName = (typeof COLOR_PALETTE)[number];

/** Display label for each color (capitalized, etc.) */
export function getColorLabel(color: string): string {
  const labels: Record<string, string> = {
    red: 'Red',
    blue: 'Blue',
    yellow: 'Yellow',
    green: 'Green',
    orange: 'Orange',
    purple: 'Purple',
    pink: 'Pink',
    brown: 'Brown',
    white: 'White',
    black: 'Black',
    teal: 'Teal',
    gold: 'Gold',
    coral: 'Coral',
    navy: 'Navy',
    lime: 'Lime',
    gray: 'Gray',
    pastel: 'Pastel',
    neon: 'Neon',
    metallic: 'Metallic',
    'earth tones': 'Earth Tones',
  };
  return labels[color.toLowerCase()] ?? color;
}

/** CSS for swatch background (small badge) */
export function getColorSwatchStyle(color: string): React.CSSProperties {
  const c = color.toLowerCase();
  switch (c) {
    case 'red':
      return { backgroundColor: '#dc2626' };
    case 'blue':
      return { backgroundColor: '#2563eb' };
    case 'yellow':
      return { backgroundColor: '#eab308' };
    case 'green':
      return { backgroundColor: '#16a34a' };
    case 'orange':
      return { backgroundColor: '#ea580c' };
    case 'purple':
      return { backgroundColor: '#9333ea' };
    case 'pink':
      return { backgroundColor: '#db2777' };
    case 'brown':
      return { backgroundColor: '#78350f' };
    case 'white':
      return { backgroundColor: '#ffffff', border: '1px solid var(--border-color)' };
    case 'black':
      return { backgroundColor: '#171717' };
    case 'teal':
      return { backgroundColor: '#0d9488' };
    case 'gold':
      return { backgroundColor: '#ca8a04' };
    case 'coral':
      return { backgroundColor: '#fb7185' };
    case 'navy':
      return { backgroundColor: '#1e3a8a' };
    case 'lime':
      return { backgroundColor: '#84cc16' };
    case 'gray':
      return { backgroundColor: '#6b7280' };
    case 'pastel':
      return {
        background: 'linear-gradient(135deg, #fecaca, #fed7aa, #fef08a, #bbf7d0, #bfdbfe, #e9d5ff)',
      };
    case 'neon':
      return {
        background: 'linear-gradient(135deg, #ff006e, #00f5d4, #fee440, #7b2cbf)',
      };
    case 'metallic':
      return {
        background: 'linear-gradient(135deg, #94a3b8, #e2e8f0, #64748b)',
      };
    case 'earth tones':
      return {
        background: 'linear-gradient(135deg, #78350f, #854d0e, #4d7c0f)',
      };
    default:
      return { backgroundColor: '#6b7280' };
  }
}

/** Whether the color is light (needs dark text for contrast) */
export function isLightColor(color: string): boolean {
  const c = color.toLowerCase();
  return ['yellow', 'white', 'lime', 'pastel', 'neon', 'metallic', 'coral', 'gray'].includes(c);
}
