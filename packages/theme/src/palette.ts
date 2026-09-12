/** Inks keep their identity on both boards. Use neutral ink for small text. */
export const INKS = [
  { id: 'cobalt', name: 'Cobalt', hex: '#1982f2' },
  { id: 'cyan', name: 'Cyan', hex: '#158eab' },
  { id: 'teal', name: 'Teal', hex: '#199287' },
  { id: 'fern', name: 'Fern', hex: '#029828' },
  { id: 'ochre', name: 'Ochre', hex: '#a67c01' },
  { id: 'vermilion', name: 'Vermilion', hex: '#e25312' },
  { id: 'rose', name: 'Rose', hex: '#e24a7a' },
  { id: 'violet', name: 'Violet', hex: '#a464e3' },
] as const;
export type Ink = (typeof INKS)[number]['id'];

export function relativeLuminance(hex: string): number {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16) / 255);
  const [r, g, b] = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function inkContrast(a: string, b: string): number {
  const values = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}
