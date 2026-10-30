import { describe, it, expect } from 'vitest';
import {
  adjustColor,
  baseIndex,
  buildScheme,
  contrastRatio,
  createSlot,
  extractColors,
  fillPalette,
  generatePalette,
  hexToRgb,
  hsvToRgb,
  hueToRyb,
  isNearGrey,
  NO_ADJUSTMENTS,
  parseDesignerParams,
  parseHex,
  readableText,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  rybToHue,
  serializeDesignerParams,
  shadeRamp,
  simulateVision,
  VARIATION_IDS,
  wcagLevel,
} from './colorScheme';
import type { Rng } from './colorScheme';
import { nearestColorName } from './colorNames';

const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('parseHex', () => {
  it('normalizes 3 and 6 digit forms', () => {
    expect(parseHex('#FF0000')).toBe('#ff0000');
    expect(parseHex('  abc ')).toBe('#aabbcc');
  });

  it('rejects anything else', () => {
    for (const bad of ['', '#', '#GGGGGG', '#12', '#1234', '#12345', '#1234567', 'red']) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe('conversions', () => {
  const rgb = hexToRgb('#233d4d');

  it('matches known values for #233d4d', () => {
    expect(rgb).toEqual({ r: 35, g: 61, b: 77 });
    const hsv = rgbToHsv(rgb);
    expect([Math.round(hsv.h), Math.round(hsv.s * 100), Math.round(hsv.v * 100)]).toEqual([203, 55, 30]);
    const hsl = rgbToHsl(rgb);
    expect(hsl.s).toBeCloseTo(0.375);
    expect(Math.round(hsl.l * 100)).toBe(22);
    const cmyk = rgbToCmyk(rgb);
    expect([cmyk.c, cmyk.m, cmyk.y, cmyk.k].map((v) => Math.round(v * 100))).toEqual([55, 21, 0, 70]);
    const lab = rgbToLab(rgb);
    expect([Math.round(lab.l), Math.round(lab.a), Math.round(lab.b)]).toEqual([24, -5, -13]);
  });

  it('survives a hex to hsv round trip', () => {
    for (const hex of ['#000000', '#ffffff', '#3366cc', '#fe7f2d', '#619b8a']) {
      expect(rgbToHex(hsvToRgb(rgbToHsv(hexToRgb(hex))))).toBe(hex);
    }
  });

  it('handles black in cmyk', () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 1 });
  });
});

describe('artist wheel', () => {
  it('round trips every hue', () => {
    for (let hue = 0; hue < 360; hue += 7) {
      expect(rybToHue(hueToRyb(hue))).toBeCloseTo(hue);
    }
  });

  it('wraps negative and overflowing angles', () => {
    expect(rybToHue(-60)).toBeCloseTo(rybToHue(300));
    expect(rybToHue(420)).toBeCloseTo(rybToHue(60));
  });
});

describe('buildScheme', () => {
  it('makes red the complement of green', () => {
    const [, complement] = buildScheme('#ff0000', 'complementary', 'standard');
    expect(rgbToHsv(hexToRgb(complement.tones[0])).h).toBeCloseTo(120);
  });

  it('builds 4 tones for every hue', () => {
    const groups = buildScheme('#ff0000', 'tetrad', 'standard');
    expect(groups).toHaveLength(4);
    expect(groups.every((group) => group.tones.length === 4)).toBe(true);
  });

  it('reproduces the standard and hard tones', () => {
    expect(buildScheme('#ff0000', 'complementary', 'standard')[0].tones).toEqual(['#ff0000', '#b30000', '#ffbfbf', '#ff8080']);
    expect(buildScheme('#ff0000', 'complementary', 'hard')[0].tones).toEqual(['#ff0000', '#990000', '#ffe6e6', '#ff6666']);
  });

  it('keeps the base exact in every variation', () => {
    for (const variation of VARIATION_IDS) {
      expect(buildScheme('#3366cc', 'tetrad', variation)[0].tones[0]).toBe('#3366cc');
    }
  });

  it('keeps grey grey', () => {
    expect(isNearGrey('#808080')).toBe(true);
    for (const variation of VARIATION_IDS) {
      for (const group of buildScheme('#808080', 'tetrad', variation)) {
        for (const tone of group.tones) {
          const { r, g, b } = hexToRgb(tone);
          expect(r === g && g === b).toBe(true);
        }
      }
    }
  });
});

describe('palettes', () => {
  const slots = (...hexes: string[]) => hexes.map((hex) => createSlot(hex));

  it('uses the first locked slot as base', () => {
    const palette = slots('#ff0000', '#00ff00', '#0000ff');
    expect(baseIndex(palette)).toBe(0);
    palette[2].locked = true;
    expect(baseIndex(palette)).toBe(2);
  });

  it('fill is repeatable without an rng and keeps the base', () => {
    const palette = slots('#3366cc', '#000000', '#000000', '#000000', '#000000');
    const once = fillPalette(palette, 'tetrad', 'standard');
    expect(fillPalette(palette, 'tetrad', 'standard')).toEqual(once);
    expect(once[0].hex).toBe('#3366cc');
    expect(new Set(once.map((slot) => slot.hex)).size).toBe(5);
  });

  it('does not repeat colors when there are more slots than tones', () => {
    const palette = fillPalette(slots(...Array<string>(10).fill('#3366cc')), 'complementary', 'standard');
    expect(new Set(palette.map((slot) => slot.hex)).size).toBe(10);
  });

  it('generate keeps locked slots and replaces the others', () => {
    const palette = slots('#111111', '#222222', '#3366cc', '#444444', '#fe7f2d');
    palette[2].locked = true;
    palette[4].locked = true;
    const next = generatePalette(palette, 'tetrad', 'standard', seeded(1));
    expect(next[2].hex).toBe('#3366cc');
    expect(next[4].hex).toBe('#fe7f2d');
    expect(next[0].hex).not.toBe('#111111');
  });

  it('generate picks a new base when nothing is locked', () => {
    const palette = slots('#111111', '#222222');
    expect(generatePalette(palette, 'tetrad', 'standard', seeded(2))[0].hex).not.toBe('#111111');
  });

  it('keeps slot ids', () => {
    const palette = slots('#111111', '#222222', '#333333');
    expect(generatePalette(palette, 'triad', 'soft', seeded(3)).map((s) => s.id)).toEqual(palette.map((s) => s.id));
  });
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1);
    expect(contrastRatio('#ffffff', '#767676')).toBeCloseTo(4.54, 1);
  });

  it('maps ratios to levels', () => {
    expect([wcagLevel(21), wcagLevel(7), wcagLevel(4.5), wcagLevel(4.49)]).toEqual(['AAA', 'AAA', 'AA', 'Fail']);
  });

  it('picks readable text', () => {
    expect(readableText('#000000')).toBe('#ffffff');
    expect(readableText('#ffffff')).toBe('#000000');
  });
});

describe('shadeRamp', () => {
  it('runs from white to black through the color', () => {
    const ramp = shadeRamp('#fe7f2d');
    expect(ramp).toHaveLength(21);
    expect([ramp[0], ramp[10], ramp[20]]).toEqual(['#ffffff', '#fe7f2d', '#000000']);
  });
});

describe('simulateVision', () => {
  it('leaves white and black alone', () => {
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
      expect(simulateVision('#ffffff', mode)).toBe('#ffffff');
      expect(simulateVision('#000000', mode)).toBe('#000000');
    }
  });

  it('removes all color for achromatopsia', () => {
    const { r, g, b } = hexToRgb(simulateVision('#fe7f2d', 'achromatopsia'));
    expect(r === g && g === b).toBe(true);
  });

  it('collapses red and green for protanopia', () => {
    const red = hexToRgb(simulateVision('#ff0000', 'protanopia'));
    expect(red.r).toBeGreaterThan(red.b);
    expect(red.g).toBeGreaterThan(red.b);
  });
});

describe('adjustColor', () => {
  it('leaves a color alone with no adjustments', () => {
    expect(adjustColor('#3366cc', NO_ADJUSTMENTS)).toBe('#3366cc');
  });

  it('applies each slider', () => {
    expect(adjustColor('#ff0000', { ...NO_ADJUSTMENTS, hue: 120 })).toBe('#00ff00');
    expect(adjustColor('#ff0000', { ...NO_ADJUSTMENTS, brightness: -50 })).toBe('#800000');
    expect(adjustColor('#ff0000', { ...NO_ADJUSTMENTS, saturation: -100 })).toBe('#ffffff');
    expect(adjustColor('#808080', { ...NO_ADJUSTMENTS, temperature: 100 })).toBe('#b2804e');
  });
});

describe('extractColors', () => {
  const pixels = (...entries: [number, number, number, number, number][]) =>
    entries.flatMap(([r, g, b, a, count]) => Array<number[]>(count).fill([r, g, b, a]).flat());

  it('finds dominant colors, most common first', () => {
    const data = pixels([255, 0, 0, 255, 30], [0, 0, 255, 255, 10]);
    expect(extractColors(data, 2)).toEqual(['#ff0000', '#0000ff']);
  });

  it('ignores transparent pixels', () => {
    expect(extractColors(pixels([255, 0, 0, 0, 30], [0, 0, 255, 255, 5]), 2)).toEqual(['#0000ff']);
  });

  it('returns nothing for empty input', () => {
    expect(extractColors([], 5)).toEqual([]);
  });

  it('never returns more colors than pixels', () => {
    expect(extractColors(pixels([1, 2, 3, 255, 1]), 5)).toEqual(['#010203']);
  });
});

describe('designer URL params', () => {
  it('round trips', () => {
    const state = { colors: ['#233d4d', '#fe7f2d'], scheme: 'triad', variation: 'hard' } as const;
    const params = serializeDesignerParams({ ...state, colors: [...state.colors] });
    expect(params.toString()).toBe('p=233d4d-fe7f2d&s=triad&v=hard');
    expect(parseDesignerParams(params)).toEqual(state);
  });

  it('drops invalid colors and caps the length', () => {
    expect(parseDesignerParams(new URLSearchParams('p=233d4d-nope-fe7f2d')).colors).toEqual(['#233d4d', '#fe7f2d']);
    const many = Array<string>(14).fill('233d4d').join('-');
    expect(parseDesignerParams(new URLSearchParams(`p=${many}`)).colors).toHaveLength(10);
  });

  it('falls back when params are unusable', () => {
    const parsed = parseDesignerParams(new URLSearchParams('p=233d4d&s=constructor&v=__proto__'));
    expect(parsed).toEqual({ colors: [], scheme: 'tetrad', variation: 'standard' });
    expect(parseDesignerParams(new URLSearchParams()).colors).toEqual([]);
  });
});

describe('nearestColorName', () => {
  it('names exact and close colors', () => {
    expect(nearestColorName('#ff0000')).toBe('Red');
    expect(nearestColorName('#4682b5')).toBe('Steel Blue');
  });
});
