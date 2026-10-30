export interface Rgb {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface Hsv {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export interface Slot {
  id: number;
  hex: string;
  locked: boolean;
}

export type SchemeId = 'complementary' | 'analogous' | 'triad' | 'split' | 'tetrad';
export type VariationId = 'standard' | 'soft' | 'hard';
export type VisionMode = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface HueGroup {
  /** Offset from the base on the artist's wheel, in degrees. */
  offset: number;
  /** Hex per entry of TONE_NAMES. */
  tones: string[];
}

export interface Adjustments {
  hue: number; // -180..180
  saturation: number; // -100..100
  brightness: number; // -100..100
  temperature: number; // -100..100
}

export const MIN_SLOTS = 2;
export const MAX_SLOTS = 10;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Normalizes #RGB / #RRGGBB (the # is optional) to lowercase #rrggbb; null when invalid. */
export const parseHex = (input: string): string | null => {
  const value = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(value)) return `#${[...value].map((c) => c + c).join('')}`;
  return /^[0-9a-f]{6}$/.test(value) ? `#${value}` : null;
};

export const hexToRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

export const rgbToHsv = ({ r, g, b }: Rgb): Hsv => {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta + 6) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return { h: h * 60, s: max === 0 ? 0 : delta / max, v: max / 255 };
};

export const hsvToRgb = ({ h, s, v }: Hsv): Rgb => {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * clamp(Math.min(k, 4 - k), 0, 1)) * 255;
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
};

/** HSL with h 0-360 and s/l 0-1. */
export const rgbToHsl = ({ r, g, b }: Rgb) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const delta = max - min;
  return { h: rgbToHsv({ r, g, b }).h, s: delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1)), l };
};

/** CMYK with all channels 0-1. */
export const rgbToCmyk = ({ r, g, b }: Rgb) => {
  const max = Math.max(r, g, b) / 255;
  if (max === 0) return { c: 0, m: 0, y: 0, k: 1 };
  return { c: 1 - r / 255 / max, m: 1 - g / 255 / max, y: 1 - b / 255 / max, k: 1 - max };
};

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (v: number) =>
  255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * clamp(v, 0, 1) ** (1 / 2.4) - 0.055);

/** CIE LAB under D65. */
export const rgbToLab = ({ r, g, b }: Rgb) => {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f((0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047);
  const fy = f(0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb);
  const fz = f((0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / 1.08883);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

/** Mixes a towards b; amount 0 = a, 1 = b. */
export const mixHex = (a: string, b: string, amount: number): string => {
  const [from, to] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
};

/** [artist's wheel angle, HSL hue]. Monotonic, so the map is continuous and invertible. */
const RYB_ANCHORS = [
  [0, 0],
  [60, 30],
  [120, 60],
  [180, 120],
  [240, 210],
  [300, 280],
  [360, 360],
] as const;

const interpolateWheel = (value: number, from: 0 | 1) => {
  const to = from === 0 ? 1 : 0;
  const wrapped = ((value % 360) + 360) % 360;
  for (let i = 1; i < RYB_ANCHORS.length; i++) {
    const [lo, hi] = [RYB_ANCHORS[i - 1], RYB_ANCHORS[i]];
    if (wrapped <= hi[from]) {
      return lo[to] + ((wrapped - lo[from]) / (hi[from] - lo[from])) * (hi[to] - lo[to]);
    }
  }
  return wrapped;
};

export const hueToRyb = (hue: number) => interpolateWheel(hue, 1);
export const rybToHue = (angle: number) => interpolateWheel(angle, 0);

export const SCHEMES: Record<SchemeId, { label: string; hint: string; offsets: number[] }> = {
  complementary: { label: 'Complementary', hint: 'Two opposite hues. Strong contrast, good for calls to action.', offsets: [0, 180] },
  analogous: { label: 'Analogous', hint: 'Three neighboring hues. Calm and cohesive.', offsets: [0, 30, -30] },
  triad: { label: 'Triad', hint: 'Three evenly spaced hues. Colorful but balanced.', offsets: [0, 120, 240] },
  split: { label: 'Split', hint: 'A base plus the neighbors of its opposite. Contrast with less tension.', offsets: [0, 150, 210] },
  tetrad: { label: 'Tetrad', hint: 'Two opposite pairs. The widest range, works best with one dominant color.', offsets: [0, 60, 180, 240] },
};

export const TONE_NAMES = ['Base', 'Dark', 'Light', 'Mid'] as const;

type Tone = (color: Hsv) => Hsv;

export const VARIATIONS: Record<VariationId, { label: string; hint: string; tones: Tone[] }> = {
  standard: {
    label: 'Standard',
    hint: 'Full strength with dark and light tones.',
    tones: [
      (c) => c,
      (c) => ({ ...c, v: c.v * 0.7 }),
      (c) => ({ ...c, s: c.s * 0.25, v: 1 }),
      (c) => ({ ...c, s: c.s * 0.5, v: 1 }),
    ],
  },
  // Soft caps saturation instead of setting it, so greys stay grey
  soft: {
    label: 'Soft',
    hint: 'Muted, low saturation tones.',
    tones: [
      (c) => ({ ...c, s: Math.min(c.s, 0.3), v: 0.8 }),
      (c) => ({ ...c, s: Math.min(c.s, 0.3), v: 0.5 }),
      (c) => ({ ...c, s: Math.min(c.s, 0.1), v: 0.9 }),
      (c) => ({ ...c, s: Math.min(c.s, 0.5), v: 0.75 }),
    ],
  },
  hard: {
    label: 'Hard',
    hint: 'Wider gap between dark and light tones.',
    tones: [
      (c) => c,
      (c) => ({ ...c, v: c.v * 0.6 }),
      (c) => ({ ...c, s: c.s * 0.1, v: 1 }),
      (c) => ({ ...c, s: c.s * 0.6, v: 1 }),
    ],
  },
};

export const SCHEME_IDS = Object.keys(SCHEMES) as SchemeId[];
export const VARIATION_IDS = Object.keys(VARIATIONS) as VariationId[];

/** All hues of a scheme with their tones. The first tone of the first group is always the exact base. */
export const buildScheme = (baseHex: string, scheme: SchemeId, variation: VariationId): HueGroup[] => {
  const base = rgbToHsv(hexToRgb(baseHex));
  const baseAngle = hueToRyb(base.h);
  return SCHEMES[scheme].offsets.map((offset) => {
    const color = { ...base, h: offset === 0 ? base.h : rybToHue(baseAngle + offset) };
    const tones = VARIATIONS[variation].tones.map((tone) => rgbToHex(hsvToRgb(tone(color))));
    return { offset, tones: offset === 0 ? [baseHex, ...tones.slice(1)] : tones };
  });
};

/** True when hue rotation has no visible effect on the color. */
export const isNearGrey = (hex: string) => rgbToHsv(hexToRgb(hex)).s < 0.08;

export type Rng = () => number;

const shuffled = <T,>(items: T[], rng: Rng): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

let nextSlotId = 1;

export const createSlot = (hex: string, locked = false): Slot => ({ id: nextSlotId++, hex, locked });

/** The first locked slot leads the palette, otherwise the first slot. */
export const baseIndex = (slots: Slot[]) => Math.max(slots.findIndex((slot) => slot.locked), 0);

/**
 * Fills every slot except the base and locked ones from the scheme's tones.
 * Without rng the order is fixed, so dragging the base picker does not flicker.
 */
export const fillPalette = (slots: Slot[], scheme: SchemeId, variation: VariationId, rng?: Rng): Slot[] => {
  const baseAt = baseIndex(slots);
  const base = slots[baseAt].hex;
  const groups = buildScheme(base, scheme, variation).map((g) => (rng ? shuffled(g.tones, rng) : g.tones));
  const picks: string[] = [];
  TONE_NAMES.forEach((_, tone) => groups.forEach((tones) => picks.push(tones[tone])));
  const unique = [...new Set(picks)].filter((hex) => hex !== base);

  let n = 0;
  return slots.map((slot, i) => {
    if (slot.locked || i === baseAt) return slot;
    const pick = unique[n % unique.length] ?? base;
    // Past the end of the tones a repeat would show twice, so lighten it
    const hex = n < unique.length ? pick : mixHex(pick, '#ffffff', 0.35);
    n++;
    return { ...slot, hex };
  });
};

const randomHex = (rng: Rng) =>
  rgbToHex(hsvToRgb({ h: rng() * 360, s: 0.45 + rng() * 0.45, v: 0.45 + rng() * 0.5 }));

/** New palette from a random base; a locked slot acts as the base instead. */
export const generatePalette = (slots: Slot[], scheme: SchemeId, variation: VariationId, rng: Rng = Math.random) => {
  const reseeded = slots.some((slot) => slot.locked)
    ? slots
    : slots.map((slot, i) => (i === 0 ? { ...slot, hex: randomHex(rng) } : slot));
  return fillPalette(reseeded, scheme, variation, rng);
};

export const relativeLuminance = ({ r, g, b }: Rgb) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export const contrastRatio = (a: string, b: string) => {
  const [la, lb] = [relativeLuminance(hexToRgb(a)), relativeLuminance(hexToRgb(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export const wcagLevel = (ratio: number) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail');

/** Black or white, whichever reads better on the color. */
export const readableText = (hex: string) =>
  contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#000000') ? '#ffffff' : '#000000';

export const SHADE_STEPS = 21;

/** White to black through the color; the color itself sits at the middle index. */
export const shadeRamp = (hex: string): string[] => {
  const middle = (SHADE_STEPS - 1) / 2;
  return Array.from({ length: SHADE_STEPS }, (_, i) =>
    i <= middle ? mixHex('#ffffff', hex, i / middle) : mixHex(hex, '#000000', (i - middle) / middle)
  );
};

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB
const VISION_MATRICES: Record<Exclude<VisionMode, 'achromatopsia'>, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const VISION_LABELS: Record<VisionMode, string> = {
  protanopia: 'Protanopia',
  deuteranopia: 'Deuteranopia',
  tritanopia: 'Tritanopia',
  achromatopsia: 'Achromatopsia',
};

export const simulateVision = (hex: string, mode: VisionMode): string => {
  const rgb = hexToRgb(hex);
  if (mode === 'achromatopsia') {
    const grey = fromLinear(relativeLuminance(rgb));
    return rgbToHex({ r: grey, g: grey, b: grey });
  }
  const linear = [toLinear(rgb.r), toLinear(rgb.g), toLinear(rgb.b)];
  const [r, g, b] = VISION_MATRICES[mode].map((row) =>
    fromLinear(Math.max(0, row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]))
  );
  return rgbToHex({ r, g, b });
};

export const NO_ADJUSTMENTS: Adjustments = { hue: 0, saturation: 0, brightness: 0, temperature: 0 };

export const adjustColor = (hex: string, { hue, saturation, brightness, temperature }: Adjustments): string => {
  const hsv = rgbToHsv(hexToRgb(hex));
  const rgb = hsvToRgb({
    h: (hsv.h + hue + 360) % 360,
    s: clamp(hsv.s * (1 + saturation / 100), 0, 1),
    v: clamp(hsv.v * (1 + brightness / 100), 0, 1),
  });
  return rgbToHex({ ...rgb, r: rgb.r + temperature / 2, b: rgb.b - temperature / 2 });
};

/**
 * Dominant colors of RGBA pixel data by k-means, most common first.
 * Pixels start sorted by brightness, so seeds spread evenly and results stay repeatable.
 */
export const extractColors = (pixels: ArrayLike<number>, count: number): string[] => {
  const points: number[][] = [];
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] >= 128) points.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  if (points.length === 0) return [];
  points.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));

  let centers = Array.from(
    { length: Math.min(count, points.length) },
    (_, i) => points[Math.floor(((i + 0.5) * points.length) / count)]
  );
  let sizes: number[] = [];
  for (let round = 0; round < 10; round++) {
    const sums = centers.map(() => [0, 0, 0]);
    sizes = centers.map(() => 0);
    for (const point of points) {
      let nearest = 0;
      let best = Infinity;
      centers.forEach((center, i) => {
        const distance = (center[0] - point[0]) ** 2 + (center[1] - point[1]) ** 2 + (center[2] - point[2]) ** 2;
        if (distance < best) [best, nearest] = [distance, i];
      });
      sizes[nearest]++;
      sums[nearest].forEach((_, c) => (sums[nearest][c] += point[c]));
    }
    centers = centers.map((center, i) => (sizes[i] ? sums[i].map((sum) => sum / sizes[i]) : center));
  }
  const ranked = centers
    .map((center, i) => ({ hex: rgbToHex({ r: center[0], g: center[1], b: center[2] }), size: sizes[i] }))
    .filter((c) => c.size > 0)
    .sort((a, b) => b.size - a.size);
  return [...new Set(ranked.map((c) => c.hex))];
};

export interface DesignerParams {
  colors: string[];
  scheme: SchemeId;
  variation: VariationId;
}

export const DEFAULT_SCHEME: SchemeId = 'tetrad';
export const DEFAULT_VARIATION: VariationId = 'standard';

/** Reads the shareable URL state; colors stay empty when too few are valid. */
export const parseDesignerParams = (params: URLSearchParams): DesignerParams => {
  const colors = (params.get('p') ?? '')
    .split('-')
    .map(parseHex)
    .filter((hex): hex is string => hex !== null)
    .slice(0, MAX_SLOTS);
  const scheme = SCHEME_IDS.find((id) => id === params.get('s')) ?? DEFAULT_SCHEME;
  const variation = VARIATION_IDS.find((id) => id === params.get('v')) ?? DEFAULT_VARIATION;
  return { colors: colors.length >= MIN_SLOTS ? colors : [], scheme, variation };
};

export const serializeDesignerParams = ({ colors, scheme, variation }: DesignerParams) =>
  new URLSearchParams({ p: colors.map((hex) => hex.slice(1)).join('-'), s: scheme, v: variation });
