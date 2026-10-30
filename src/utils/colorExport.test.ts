import { describe, it, expect } from 'vitest';
import { EXPORT_FORMATS, tokenNames } from './colorExport';

const HEXES = ['#ff0000', '#4682b4', '#ff0000'];

describe('tokenNames', () => {
  it('uses kebab-case and suffixes repeats', () => {
    expect(tokenNames(HEXES)).toEqual(['red', 'steel-blue', 'red-2']);
  });
});

describe('EXPORT_FORMATS', () => {
  it('writes valid CSS without line comments', () => {
    const css = EXPORT_FORMATS.css.build(HEXES);
    expect(css).not.toContain('//');
    expect(css).toContain('--color-steel-blue: #4682b4;');
    expect(css.trim().endsWith('}')).toBe(true);
  });

  it('ends every SCSS line with a semicolon', () => {
    const lines = EXPORT_FORMATS.scss.build(HEXES).trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => /^\$color-[a-z0-9-]+: #[0-9a-f]{6};$/.test(line))).toBe(true);
  });

  it('builds Tailwind ramps with the color at 500', () => {
    const tailwind = EXPORT_FORMATS.tailwind.build(['#fe7f2d']);
    expect(tailwind).toContain("DEFAULT: '#fe7f2d'");
    expect(tailwind).toContain("500: '#fe7f2d'");
    expect(tailwind).toContain("100: '");
    expect(tailwind).toContain("900: '");
    expect(tailwind).not.toContain('undefined');
  });

  it('assigns Bootstrap roles and handles extra colors', () => {
    const scss = EXPORT_FORMATS.bootstrap.build(Array<string>(9).fill('#ff0000'));
    expect(scss).toContain('$primary: #ff0000;');
    expect(scss).toContain('$dark: #ff0000;');
    expect(scss).toContain('$color-9: #ff0000;');
    expect(scss).not.toContain('undefined');
  });

  it('writes parseable JSON', () => {
    expect(JSON.parse(EXPORT_FORMATS.json.build(HEXES))).toEqual({
      red: '#ff0000',
      'steel-blue': '#4682b4',
      'red-2': '#ff0000',
    });
  });

  it('writes one rect per color in SVG', () => {
    const svg = EXPORT_FORMATS.svg.build(HEXES);
    expect(svg.match(/<rect /g)).toHaveLength(3);
    expect(svg).toContain('width="480"');
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull();
  });
});
