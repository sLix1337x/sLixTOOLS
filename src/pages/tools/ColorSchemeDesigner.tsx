import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check,
  Code2,
  Contrast,
  Eye,
  ImagePlus,
  Keyboard,
  Palette,
  Plus,
  Redo2,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Undo2,
} from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import AdjustPanel from '@/components/tools/color/AdjustPanel';
import ContrastMatrix from '@/components/tools/color/ContrastMatrix';
import ExportPanel from '@/components/tools/color/ExportPanel';
import HarmonyGrid from '@/components/tools/color/HarmonyGrid';
import PaletteColumns from '@/components/tools/color/PaletteColumns';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { useHistory } from '@/hooks';
import {
  fieldClass,
  guideCard,
  guideHeading,
  guideKey,
  primaryButton,
  segmentButton,
  segmentGroup,
  toolButton,
} from '@/styles/constants';
import { copyWithToast } from '@/utils/clipboard';
import {
  adjustColor,
  baseIndex,
  buildScheme,
  createSlot,
  extractColors,
  fillPalette,
  generatePalette,
  isNearGrey,
  MAX_SLOTS,
  MIN_SLOTS,
  mixHex,
  NO_ADJUSTMENTS,
  parseDesignerParams,
  parseHex,
  readableText,
  SCHEME_IDS,
  SCHEMES,
  serializeDesignerParams,
  simulateVision,
  VARIATION_IDS,
  VARIATIONS,
  VISION_LABELS,
} from '@/utils/colorScheme';
import type { Adjustments, SchemeId, Slot, VariationId, VisionMode } from '@/utils/colorScheme';

interface Design {
  slots: Slot[];
  scheme: SchemeId;
  variation: VariationId;
}

const DEFAULT_SLOT_COUNT = 5;
const URL_DEBOUNCE_MS = 300;
const IMAGE_SAMPLE_SIZE = 64;
const NO_VISION = 'none';

const VISION_IDS = Object.keys(VISION_LABELS) as VisionMode[];

// Space must keep working on these, so it only generates when focus is elsewhere
const SPACE_TARGETS = 'input,textarea,select,button,a,summary,[role=slider],[role=combobox],[role=option]';

const designFromParams = (params: URLSearchParams): Design => {
  const { colors, scheme, variation } = parseDesignerParams(params);
  const slots = colors.length
    ? colors.map((hex) => createSlot(hex))
    : generatePalette(Array.from({ length: DEFAULT_SLOT_COUNT }, () => createSlot('#000000')), scheme, variation);
  return { slots, scheme, variation };
};

const readImagePixels = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_SAMPLE_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
};

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Palette className="h-5 w-5" aria-hidden="true" />
      </span>
      How to Build a Color Palette
    </h2>
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Set a starting point', 'Type a hex value or use the color picker in the toolbar. Or press Space and let the tool pick one.'],
        ['Pick a harmony', 'Choose a scheme and a variation. They update every color except the base and any you locked.'],
        ['Lock and refine', 'Hover a color to lock it, then press Space until the rest fit. Click the + between two colors to add a mix of both.'],
        ['Check and export', 'Find readable text pairs in the contrast table, try the color vision preview, then copy the code or download a file.'],
      ].map(([title, text], i) => (
        <li key={title} className={guideCard}>
          <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-400/15 text-sm font-semibold text-sky-300">
            {i + 1}
          </span>
          <h3 className="mt-0 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-300">{text}</p>
        </li>
      ))}
    </ol>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Which Harmony Fits?
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {SCHEME_IDS.map((id) => (
            <li key={id} className="flex gap-2.5">
              <Check className="h-3.5 w-3.5 text-blue-400 mt-1 flex-shrink-0" aria-hidden="true" />
              <span><strong>{SCHEMES[id].label}:</strong> {SCHEMES[id].hint}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Contrast className="h-5 w-5" aria-hidden="true" />
          Reading the Contrast Table
        </h3>
        <p className="mt-0 mb-2 text-sm leading-relaxed text-gray-300">
          Every color is tested against every other. Rows are the background, columns the text color.
        </p>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {[
            ['AAA:', 'ratio of 7:1 or more, the safest choice for long text.'],
            ['AA:', 'ratio of 4.5:1 or more, the minimum for normal text.'],
            ['Fail:', 'below 4.5:1. Avoid it for body text. Large headings only need 3:1, so some of these pairs still work there.'],
          ].map(([term, desc]) => (
            <li key={term} className="flex gap-2.5">
              <Check className="h-3.5 w-3.5 text-blue-400 mt-1 flex-shrink-0" aria-hidden="true" />
              <span><strong>{term}</strong> {desc}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Code2 className="h-5 w-5" aria-hidden="true" />
          Which Export Do I Need?
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {[
            ['CSS:', 'custom properties that work in any project.'],
            ['SCSS:', 'variables for Sass projects.'],
            ['Tailwind:', 'a tailwind.config.js block with a 100 to 900 scale for every color.'],
            ['Bootstrap 5:', 'theme variables to set before you import Bootstrap.'],
            ['JSON:', 'color names and hex values for scripts or design tokens.'],
            ['SVG and PNG:', 'a swatch image for design tools and presentations.'],
          ].map(([term, desc]) => (
            <li key={term} className="flex gap-2.5">
              <Check className="h-3.5 w-3.5 text-blue-400 mt-1 flex-shrink-0" aria-hidden="true" />
              <span><strong>{term}</strong> {desc}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Keyboard Shortcuts
        </h3>
        <dl className="space-y-2 text-sm text-gray-300">
          {[
            ['Space', 'New palette, locked colors stay'],
            ['Ctrl + Z', 'Undo'],
            ['Ctrl + Y', 'Redo'],
            ['Arrow keys', 'Move a color while its drag handle has focus'],
          ].map(([key, action]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt><kbd className={guideKey}>{key}</kbd></dt>
              <dd className="text-right">{action}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-gray-400">On a Mac, use Cmd instead of Ctrl.</p>
      </section>
    </div>
  </div>
);

const ColorSchemeDesigner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { present: design, canUndo, canRedo, commit, undo, redo } = useHistory(() => designFromParams(searchParams));
  const { slots, scheme, variation } = design;

  const [visionMode, setVisionMode] = useState<VisionMode | typeof NO_VISION>(NO_VISION);
  const [adjust, setAdjust] = useState<Adjustments | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const previewing = adjust !== null;
  const baseSlot = slots[baseIndex(slots)];
  const baseHex = baseSlot.hex;
  const canAdd = slots.length < MAX_SLOTS;
  const canRemove = slots.length > MIN_SLOTS;

  const [hexDraft, setHexDraft] = useState(baseHex.toUpperCase());
  const hexInvalid = parseHex(hexDraft) === null;
  // Only overwrite the field when the base really moved, so typing "#abc" is not expanded mid-word
  useEffect(() => {
    setHexDraft((draft) => (parseHex(draft) === baseHex ? draft : baseHex.toUpperCase()));
  }, [baseHex]);

  const displayed = useMemo(
    () =>
      adjust
        ? slots.map((slot) => (slot.locked ? slot : { ...slot, hex: adjustColor(slot.hex, adjust) }))
        : slots,
    [adjust, slots]
  );
  const hexes = useMemo(() => displayed.map((slot) => slot.hex), [displayed]);
  const groups = useMemo(() => buildScheme(baseHex, scheme, variation), [baseHex, scheme, variation]);

  const generate = useCallback(() => {
    commit({ ...design, slots: generatePalette(slots, scheme, variation) });
  }, [commit, design, scheme, slots, variation]);

  const setBase = (hex: string) => {
    const moved = slots.map((slot) => (slot === baseSlot ? { ...slot, hex } : slot));
    commit({ ...design, slots: fillPalette(moved, scheme, variation) }, true);
  };

  const setScheme = (next: SchemeId) => {
    commit({ ...design, scheme: next, slots: fillPalette(slots, next, variation) });
  };

  const setVariation = (next: VariationId) => {
    commit({ ...design, variation: next, slots: fillPalette(slots, scheme, next) });
  };

  const addColor = (hex?: string) => {
    if (!canAdd) return;
    const used = new Set(slots.map((slot) => slot.hex));
    const next =
      hex ??
      groups.flatMap((group) => group.tones).find((tone) => !used.has(tone)) ??
      mixHex(slots[slots.length - 1].hex, '#ffffff', 0.35);
    commit({ ...design, slots: [...slots, createSlot(next)] });
  };

  const insertColor = (index: number) => {
    if (!canAdd) return;
    const next = [...slots];
    next.splice(index, 0, createSlot(mixHex(slots[index - 1].hex, slots[index].hex, 0.5)));
    commit({ ...design, slots: next });
  };

  const updateSlot = (id: number, patch: Partial<Slot>, coalesce = false) => {
    commit({ ...design, slots: slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)) }, coalesce);
  };

  const importImage = async (file: File) => {
    const unlocked = slots.filter((slot) => !slot.locked).length;
    if (unlocked === 0) {
      toast.error('Unlock at least one color to import from an image.');
      return;
    }
    try {
      const colors = extractColors(await readImagePixels(file), unlocked);
      if (colors.length === 0) {
        toast.error('No visible colors found in this image.');
        return;
      }
      let next = 0;
      commit({ ...design, slots: slots.map((slot) => (slot.locked ? slot : { ...slot, hex: colors[next++] ?? slot.hex })) });
      setImportOpen(false);
    } catch {
      toast.error('Could not read this image.');
    }
  };

  // URL state. replace keeps the back button usable, and the debounce covers continuous picker input
  const query = useMemo(
    () => serializeDesignerParams({ colors: slots.map((slot) => slot.hex), scheme, variation }).toString(),
    [scheme, slots, variation]
  );
  const incomingQuery = searchParams.toString();
  const lastQuery = useRef(incomingQuery);

  useEffect(() => {
    if (query === lastQuery.current) return undefined;
    const timer = setTimeout(() => {
      lastQuery.current = query;
      setSearchParams(query, { replace: true });
    }, URL_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, setSearchParams]);

  // A shared link pasted into this tab only changes the hash, so the page does not reload
  useEffect(() => {
    if (incomingQuery === lastQuery.current) return;
    lastQuery.current = incomingQuery;
    if (parseDesignerParams(new URLSearchParams(incomingQuery)).colors.length) {
      commit(designFromParams(new URLSearchParams(incomingQuery)));
    }
  }, [commit, incomingQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewing) return;
      const target = e.target as HTMLElement;
      if (e.code === 'Space') {
        if (e.repeat || target.closest(SPACE_TARGETS)) return;
        e.preventDefault();
        generate();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || target.closest('input[type="text"],textarea')) return;
      const key = e.key.toLowerCase();
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else if (key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generate, previewing, redo, undo]);

  // A mouse click leaves focus on the button, where Space would press it again instead of generating.
  // Keyboard clicks have detail 0, so keyboard users keep their focus.
  const releaseMouseFocus = (e: MouseEvent) => {
    if (e.detail > 0 && document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  };

  return (
    <ToolPageLayout
      title="Color Scheme Designer"
      description="Generate harmonious color palettes, check contrast and export them as CSS, Tailwind or SCSS."
      keywords="color scheme generator, color palette generator, harmonious colors, complementary colors, triad, tetrad, WCAG contrast checker, color blindness simulator, tailwind colors, css variables"
      canonicalUrl="/tools/color-scheme-designer"
      pageTitle="Color Scheme Designer - sLixTOOLS"
      pageDescription="Free color palette generator based on color theory. Press space for new harmonious palettes, lock colors, check WCAG contrast, simulate color blindness and export CSS, SCSS, Tailwind, Bootstrap, SVG or PNG."
      breadcrumbLabel="Color Scheme Designer"
      belowTool={seoContent}
      faq={[
        {
          question: 'How do I add, remove or reorder colors?',
          answer:
            'Hover the edge between two colors and click the + to insert a mix of both, or use the + in the toolbar to add a matching color at the end. A palette holds 2 to 10 colors. Hover a color to remove it, or drag its handle to move it.',
        },
        {
          question: 'Why does one color stay the same when I press Space?',
          answer:
            'Locked colors survive every change, and the first locked color becomes the base that new palettes are built around. Without a lock, Space starts from a new random base color.',
        },
        {
          question: 'How do I find text colors that are readable?',
          answer:
            'Look at the contrast table below the palette. Pick the row of your background color and read across to a text color marked AA or AAA. Pairs marked Fail are below 4.5:1 and too weak for normal text.',
        },
        {
          question: 'How do I use the palette in my project?',
          answer:
            'Choose a format in the Export panel, then copy the code or download the file. For Tailwind, merge the block into the colors section of tailwind.config.js. For Bootstrap, set the variables before you import Bootstrap.',
        },
        {
          question: 'How are the colors chosen?',
          answer:
            'Every palette starts from a base color and follows a harmony on the artist’s color wheel, where red sits opposite green. Each hue gets four tones, and the palette draws from those tones. The base color always stays exactly as you set it.',
        },
        {
          question: 'How do I keep or share a palette?',
          answer:
            'The page address always contains the palette. Bookmark it, or use the share button to copy it. There is no account and nothing is stored on a server.',
        },
        {
          question: 'Can I build a palette from an image?',
          answer:
            'Yes. The image button replaces all unlocked colors with colors found in your picture, so lock any you want to keep. It runs entirely in your browser and the image never leaves your device.',
        },
        {
          question: 'Is the color blindness preview accurate?',
          answer:
            'It uses the Machado 2009 model at full severity. That is a good approximation for checking whether colors stay distinct, but real vision differs from person to person.',
        },
      ]}
    >
      <div onClick={releaseMouseFocus} className="flex flex-col md:min-h-[calc(100dvh-3rem)]">
        <fieldset disabled={previewing} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="base-hex" className="sr-only">
              Base color
            </Label>
            <Tooltip label="Base color" hint="Every harmony is built from this color" side="bottom">
              <input
                type="color"
                value={baseHex}
                onChange={(e) => setBase(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-md border border-white/15 bg-transparent p-0.5 disabled:cursor-not-allowed"
                aria-label="Pick base color"
              />
            </Tooltip>
            <input
              id="base-hex"
              type="text"
              value={hexDraft}
              spellCheck={false}
              aria-invalid={hexInvalid}
              onChange={(e) => {
                setHexDraft(e.target.value);
                const parsed = parseHex(e.target.value);
                if (parsed && parsed !== baseHex) setBase(parsed);
              }}
              onBlur={() => setHexDraft(baseHex.toUpperCase())}
              className={`${fieldClass} !w-24 font-mono ${hexInvalid ? 'border-red-400/70 focus:border-red-400/70' : ''}`}
            />
          </div>
          <div role="group" aria-label="Scheme" className={segmentGroup}>
            {SCHEME_IDS.map((id) => (
              <Tooltip key={id} label={SCHEMES[id].label} hint={SCHEMES[id].hint} side="bottom">
                <button type="button" className={segmentButton} aria-pressed={scheme === id} onClick={() => setScheme(id)}>
                  {SCHEMES[id].label}
                </button>
              </Tooltip>
            ))}
          </div>
          <div role="group" aria-label="Variation" className={segmentGroup}>
            {VARIATION_IDS.map((id) => (
              <Tooltip key={id} label={VARIATIONS[id].label} hint={VARIATIONS[id].hint} side="bottom">
                <button type="button" className={segmentButton} aria-pressed={variation === id} onClick={() => setVariation(id)}>
                  {VARIATIONS[id].label}
                </button>
              </Tooltip>
            ))}
          </div>
          {isNearGrey(baseHex) && (
            <p className="order-last mt-0 w-full text-sm text-amber-300">
              This base is almost grey, so it has no hue to rotate. All tones stay grey until you pick a stronger color.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1 lg:ml-auto">
            <Tooltip label="Generate palette" hint="Locked colors stay" side="bottom">
              <button
                type="button"
                onClick={generate}
                className={primaryButton}
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                Generate
                <kbd className="hidden rounded border border-white/30 px-1 font-sans text-[10px] sm:inline">Space</kbd>
              </button>
            </Tooltip>
            <ToolbarDivider />
            <Tooltip label="Undo" shortcut="Ctrl+Z" side="bottom">
              <button type="button" className={toolButton} onClick={undo} disabled={!canUndo} aria-label="Undo">
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Redo" shortcut="Ctrl+Y" side="bottom">
              <button type="button" className={toolButton} onClick={redo} disabled={!canRedo} aria-label="Redo">
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <ToolbarDivider />
            <Tooltip
              label="Add color"
              hint={canAdd ? 'Adds a matching color at the end' : `Limit of ${MAX_SLOTS} colors reached`}
              side="bottom"
            >
              <button type="button" className={toolButton} onClick={() => addColor()} disabled={!canAdd} aria-label="Add color">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="From image" hint="Fills unlocked colors from a picture" side="bottom">
              <button
                type="button"
                className={toolButton}
                aria-pressed={importOpen}
                aria-label="Import colors from image"
                onClick={() => setImportOpen((open) => !open)}
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Adjust" hint="Hue, saturation, brightness and temperature" side="bottom">
              <button type="button" className={toolButton} onClick={() => setAdjust(NO_ADJUSTMENTS)} aria-label="Adjust colors">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Share link" hint="Copies a link to this palette" side="bottom">
              <button
                type="button"
                className={toolButton}
                aria-label="Copy share link"
                onClick={() =>
                  void copyWithToast(`${window.location.href.split('#')[0]}#${pathname}?${query}`, 'Copied share link')
                }
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Select value={visionMode} onValueChange={(value) => setVisionMode(value as VisionMode | typeof NO_VISION)}>
              <Tooltip label="Color vision preview" hint="Simulates color blindness" side="bottom">
                <SelectTrigger
                  className={`h-9 w-auto gap-1 border-0 bg-transparent px-2 hover:bg-white/10 hover:text-white ${
                    visionMode === NO_VISION ? 'text-slate-300' : 'bg-sky-400/20 text-sky-300'
                  }`}
                  aria-label="Color vision preview"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </SelectTrigger>
              </Tooltip>
              <SelectContent align="end">
                <SelectItem value={NO_VISION}>Normal vision</SelectItem>
                {VISION_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {VISION_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        {importOpen && (
          <div className="px-4 pb-3">
            <FileUploadArea
              onFileSelected={(file) => void importImage(file)}
              acceptedTypes={['image/*']}
              fileCategory="image"
              title="Drop an image here"
              description="Its main colors fill your unlocked slots. The image stays in your browser."
            />
          </div>
        )}

        {adjust && (
          <div className="px-4 pb-3">
            <AdjustPanel
              value={adjust}
              onChange={setAdjust}
              onApply={() => {
                commit({ ...design, slots: displayed });
                setAdjust(null);
              }}
              onCancel={() => setAdjust(null)}
            />
          </div>
        )}

        <PaletteColumns
          slots={displayed}
          baseId={baseSlot.id}
          disabled={previewing}
          canRemove={canRemove}
          canAdd={canAdd}
          onInsert={insertColor}
          onReorder={(next) => commit({ ...design, slots: next }, true)}
          onToggleLock={(id) => updateSlot(id, { locked: !slots.find((slot) => slot.id === id)?.locked })}
          onRemove={(id) => commit({ ...design, slots: slots.filter((slot) => slot.id !== id) })}
          onChange={(id, hex) => updateSlot(id, { hex }, true)}
        >
          {visionMode !== NO_VISION && (
            <div>
              <p className="my-1 px-4 text-xs text-slate-300">{VISION_LABELS[visionMode]} preview</p>
              <div className="flex overflow-hidden">
                {hexes.map((hex, i) => {
                  const simulated = simulateVision(hex, visionMode);
                  return (
                    <div
                      key={slots[i].id}
                      className="flex h-14 min-w-0 flex-1 items-center justify-center font-mono text-[10px] sm:text-xs"
                      style={{ backgroundColor: simulated, color: readableText(simulated) }}
                    >
                      <span className="truncate">{simulated.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PaletteColumns>
      </div>

      <div
        onClick={releaseMouseFocus}
        className="grid grid-cols-1 gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)]"
      >
        <HarmonyGrid groups={groups} canAdd={canAdd && !previewing} onAdd={addColor} />
        <ContrastMatrix hexes={hexes} />
        <ExportPanel hexes={hexes} />
      </div>

    </ToolPageLayout>
  );
};

export default ColorSchemeDesigner;
