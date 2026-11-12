// Colour parsing and conversion.  Appearance is kept entirely separate from physics: nothing in this
// file (or in the appearance state) is part of any cache key or worker message.
export type RGB = [number, number, number];

/** Parse "#rgb", "#rrggbb", "rgb" or "rrggbb" (case-insensitive).  Returns null if invalid. */
export function parseHex(s: string): RGB | null {
  const t = s.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(t)) return [parseInt(t[0] + t[0], 16), parseInt(t[1] + t[1], 16), parseInt(t[2] + t[2], 16)];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)];
  return null;
}

/** A single RGB channel from user text: integer 0–255, rounded and clamped; null if not a number. */
export function parseChannel(s: string | number): number | null {
  const v = typeof s === 'number' ? s : Number(String(s).trim());
  if (!Number.isFinite(v) || String(s).trim() === '') return null;
  return Math.min(255, Math.max(0, Math.round(v)));
}

export function toHex(c: RGB): string {
  return '#' + c.map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Normalise any accepted hex text to "#rrggbb" or return null. */
export function normaliseHex(s: string): string | null { const c = parseHex(s); return c ? toHex(c) : null; }

export function hsvToRgb(h: number, s: number, v: number): RGB {
  h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
export function rgbToHsv(c: RGB): [number, number, number] {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx === 0 ? 0 : d / mx, mx];
}

/** Pack to a little-endian ABGR uint32 for ImageData Uint32 views. */
export function packRGB(c: RGB, a = 255): number { return ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }

/** Linear blend of two colours. */
export function mix(a: RGB, b: RGB, t: number): RGB { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as RGB; }
