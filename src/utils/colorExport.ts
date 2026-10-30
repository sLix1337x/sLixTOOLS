import { readableText, shadeRamp } from './colorScheme';
import { nearestColorName } from './colorNames';

export type ExportFormat = 'css' | 'scss' | 'tailwind' | 'bootstrap' | 'json' | 'svg';

/** Kebab-case token names; a repeated color name gets a numeric suffix. */
export const tokenNames = (hexes: string[]): string[] => {
  const seen = new Map<string, number>();
  return hexes.map((hex) => {
    const name = nearestColorName(hex).toLowerCase().replace(/\s+/g, '-');
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name}-${count}`;
  });
};

const toCss = (hexes: string[]) => {
  const names = tokenNames(hexes);
  return `:root {\n${hexes.map((hex, i) => `  --color-${names[i]}: ${hex};`).join('\n')}\n}\n`;
};

const toScss = (hexes: string[]) => {
  const names = tokenNames(hexes);
  return `${hexes.map((hex, i) => `$color-${names[i]}: ${hex};`).join('\n')}\n`;
};

const TAILWIND_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const toTailwind = (hexes: string[]) => {
  const names = tokenNames(hexes);
  const colors = hexes.map((hex, i) => {
    const ramp = shadeRamp(hex);
    // The ramp has 21 steps, so weight / 50 lands on the matching step and 500 on the color itself
    const steps = TAILWIND_WEIGHTS.map((weight) => `          ${weight}: '${ramp[weight / 50]}',`);
    return `        '${names[i]}': {\n          DEFAULT: '${hex}',\n${steps.join('\n')}\n        },`;
  });
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${colors.join('\n')}\n      },\n    },\n  },\n};\n`;
};

const BOOTSTRAP_ROLES = ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark'];

const toBootstrap = (hexes: string[]) =>
  `// Set before importing Bootstrap\n${hexes
    .map((hex, i) => `$${BOOTSTRAP_ROLES[i] ?? `color-${i + 1}`}: ${hex};`)
    .join('\n')}\n`;

const toJson = (hexes: string[]) => {
  const names = tokenNames(hexes);
  return `${JSON.stringify(Object.fromEntries(hexes.map((hex, i) => [names[i], hex])), null, 2)}\n`;
};

const SWATCH_WIDTH = 160;
const SWATCH_HEIGHT = 240;

const toSvg = (hexes: string[]) => {
  const swatches = hexes.map(
    (hex, i) =>
      `  <rect x="${i * SWATCH_WIDTH}" width="${SWATCH_WIDTH}" height="${SWATCH_HEIGHT}" fill="${hex}"/>\n` +
      `  <text x="${(i + 0.5) * SWATCH_WIDTH}" y="${SWATCH_HEIGHT - 24}" fill="${readableText(hex)}" font-family="monospace" font-size="20" text-anchor="middle">${hex.toUpperCase()}</text>`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${hexes.length * SWATCH_WIDTH}" height="${SWATCH_HEIGHT}">\n${swatches.join('\n')}\n</svg>\n`;
};

export const EXPORT_FORMATS: Record<
  ExportFormat,
  { label: string; filename: string; mime: string; build: (hexes: string[]) => string }
> = {
  css: { label: 'CSS', filename: 'palette.css', mime: 'text/css', build: toCss },
  scss: { label: 'SCSS', filename: 'palette.scss', mime: 'text/x-scss', build: toScss },
  tailwind: { label: 'Tailwind', filename: 'tailwind.colors.js', mime: 'text/javascript', build: toTailwind },
  bootstrap: { label: 'Bootstrap 5', filename: 'bootstrap-colors.scss', mime: 'text/x-scss', build: toBootstrap },
  json: { label: 'JSON', filename: 'palette.json', mime: 'application/json', build: toJson },
  svg: { label: 'SVG', filename: 'palette.svg', mime: 'image/svg+xml', build: toSvg },
};

/** Renders the palette as a PNG, one swatch per color. */
export const renderPalettePng = (hexes: string[]): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = hexes.length * SWATCH_WIDTH;
    canvas.height = SWATCH_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas is not available'));
      return;
    }
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    hexes.forEach((hex, i) => {
      ctx.fillStyle = hex;
      ctx.fillRect(i * SWATCH_WIDTH, 0, SWATCH_WIDTH, SWATCH_HEIGHT);
      ctx.fillStyle = readableText(hex);
      ctx.fillText(hex.toUpperCase(), (i + 0.5) * SWATCH_WIDTH, SWATCH_HEIGHT - 24);
    });
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the PNG'))), 'image/png');
  });
