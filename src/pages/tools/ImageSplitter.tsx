import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Archive,
  Check,
  Download,
  Equal,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Keyboard,
  LayoutGrid,
  Minus,
  Plus,
  RefreshCw,
  Scissors,
  Upload,
} from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import { Tooltip } from '@/components/ui/tooltip';
import {
  chipButton,
  fieldClass,
  guideCard,
  guideHeading,
  guideKey,
  primaryButton,
  segmentButton,
  segmentGroup,
  statusRow,
  toolButton,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';
import { downloadBlob } from '@/utils/download';
import { cn } from '@/lib/utils';
import { allCuts, insertCut, moveCut, uniformCuts } from '@/utils/imageSplitterCuts';

const MAX_CUTS = 19;

interface SplitPart {
  r: number;
  c: number;
  seq: number;
  blob: Blob;
  /** Name without any view preset applied (pattern-generated or manual) */
  core: string;
  /** Final name: core composed with the active view preset and mode */
  name: string;
  customName: boolean;
  preset: PresetKey | null;
  url: string;
  w: number;
  h: number;
}

type Axis = 'x' | 'y';
type PatternMode = 'seq' | 'grid';
type PresetMode = 'append' | 'replace';
type PresetKey = 'front' | 'back' | 'left' | 'right';

const PRESET_LABELS: Record<PresetKey, string> = {
  front: 'Front View',
  back: 'Back View',
  left: 'Left View',
  right: 'Right View',
};

/** Compose a part's final name from its core name, optional view preset and mode. */
const composeName = (core: string, preset: PresetKey | null, mode: PresetMode): string => {
  if (!preset) return core;
  const label = PRESET_LABELS[preset];
  if (mode === 'replace') return `${label}.png`;
  return `${core.replace(/\.png$/, '')}_${label}.png`;
};

const PRESETS = [
  { cols: 2, rows: 2 },
  { cols: 4, rows: 1 },
  { cols: 1, rows: 4 },
  { cols: 2, rows: 3 },
  { cols: 3, rows: 2 },
  { cols: 2, rows: 4 },
  { cols: 4, rows: 2 },
  { cols: 3, rows: 3 },
  { cols: 3, rows: 4 },
] as const;

/** Cut line colors, so the lines stay visible on any image */
const LINE_COLORS = [
  { name: 'Blue', value: '#38bdf8' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Magenta', value: '#ff00ff' },
] as const;

const sanitize = (s: string): string => s.replace(/[\\/:*?"<>|]/g, '').trim() || 'image';

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
};

interface NameablePart {
  seq: number;
  r: number;
  c: number;
}

const genName = (p: NameablePart, base: string, pattern: PatternMode): string => {
  const suffix =
    pattern === 'seq'
      ? String(p.seq).padStart(2, '0')
      : `r${String(p.r + 1).padStart(2, '0')}c${String(p.c + 1).padStart(2, '0')}`;
  return `${base}_${suffix}.png`;
};

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Scissors className="h-5 w-5" aria-hidden="true" />
      </span>
      How to Split an Image
    </h2>
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Add your image', 'Drop a file on the page or click the upload area. Dropping a new file later replaces the current one.'],
        ['Set the grid', 'Pick a preset, or set columns and rows yourself. Drag any line on the preview to move that cut.'],
        ['Split', 'Press Split image. Every part is cut at full resolution and saved as a lossless PNG.'],
        ['Name and download', 'Set a base name, rename single parts if you like, then download everything as a ZIP.'],
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          Typical Uses
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {[
            ['Social media grids:', 'cut one picture into 3×3 or 3×4 tiles for a profile page.'],
            ['Carousels:', 'a 4×1 split turns a wide image into swipeable slides.'],
            ['Sprite sheets:', 'separate game sprites or icons with even cuts.'],
            ['Character sheets:', 'split a turnaround and name the parts Front, Back, Left and Right View.'],
            ['Uneven layouts:', 'drag the lines to follow panels of a comic or a page layout.'],
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
          <FileText className="h-5 w-5" aria-hidden="true" />
          How Files Are Named
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {[
            ['Sequential:', 'photo_01.png, photo_02.png, counted row by row.'],
            ['Row & column:', 'photo_r01c02.png shows where a part belongs.'],
            ['View presets:', 'add a view to the name, or let it replace the name.'],
            ['Duplicates:', 'matching names are marked and get _2, _3 on download.'],
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
          Moving Cuts by Keyboard
        </h3>
        <p className="mt-0 mb-3 text-sm leading-relaxed text-gray-300">Press Tab until a cut line has focus, then:</p>
        <dl className="space-y-2 text-sm text-gray-300">
          {[
            ['Arrow keys', 'Move the cut by 1 px'],
            ['Shift + Arrow keys', 'Move the cut by 10 px'],
            ['Delete', 'Remove the cut'],
          ].map(([key, action]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt><kbd className={guideKey}>{key}</kbd></dt>
              <dd className="text-right">{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  </div>
);

const Stepper = ({
  label,
  unit,
  value,
  onAdd,
  onRemove,
  canAdd,
  canRemove,
}: {
  label: string;
  unit: string;
  value: number;
  onAdd: () => void;
  onRemove: () => void;
  canAdd: boolean;
  canRemove: boolean;
}) => (
  <div role="group" aria-label={label} className="inline-flex items-center rounded-lg bg-white/[0.06] p-0.5">
    <span className="px-2 text-xs font-medium text-slate-300">{label}</span>
    <Tooltip label={`Remove ${unit}`} side="bottom">
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove ${unit}`}
        className={`${toolButton} !h-8 !w-8`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
    <span className="w-6 text-center text-sm font-medium text-white tabular-nums">{value}</span>
    <Tooltip label={`Add ${unit}`} hint="Adds a cut in the widest gap." side="bottom">
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        aria-label={`Add ${unit}`}
        className={`${toolButton} !h-8 !w-8`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  </div>
);

const ImageSplitter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [cutsX, setCutsX] = useState<number[]>([]);
  const [cutsY, setCutsY] = useState<number[]>([]);
  const [custom, setCustom] = useState(false);
  const [parts, setParts] = useState<SplitPart[]>([]);
  const [baseName, setBaseName] = useState('image');
  const [pattern, setPattern] = useState<PatternMode>('seq');
  const [presetMode, setPresetMode] = useState<PresetMode>('append');
  const [isSplitting, setIsSplitting] = useState(false);
  const [dragging, setDragging] = useState<{ axis: Axis; idx: number } | null>(null);
  const [edit, setEdit] = useState<{ idx: number; value: string } | null>(null);
  const [wsDragging, setWsDragging] = useState(false);
  const [lineColorIndex, setLineColorIndex] = useState(0);
  const lineColor = LINE_COLORS[lineColorIndex];
  const nextLineColorIndex = (lineColorIndex + 1) % LINE_COLORS.length;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Bumped to cancel in-flight work: image loads (new load/reset/unmount), splits (any invalidation)
  const loadIdRef = useRef(0);
  const splitGenRef = useRef(0);

  // Keep current values reachable for unmount cleanup
  const cleanupRef = useRef({ bitmap, sourceUrl, parts });
  useEffect(() => {
    cleanupRef.current = { bitmap, sourceUrl, parts };
  });
  useEffect(
    () => () => {
      loadIdRef.current++;
      splitGenRef.current++;
      const s = cleanupRef.current;
      if (s.bitmap) s.bitmap.close();
      if (s.sourceUrl) URL.revokeObjectURL(s.sourceUrl);
      s.parts.forEach((p) => URL.revokeObjectURL(p.url));
    },
    []
  );

  const invalidateParts = useCallback(() => {
    splitGenRef.current++;
    setParts((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  const base = sanitize(baseName || 'image');

  // Live names include in-progress edits so duplicate highlighting is instant
  const effectiveNames = parts.map((p, i) =>
    edit && edit.idx === i ? (edit.value.trim() ? `${edit.value.trim()}.png` : p.name) : p.name
  );

  const isEven = useCallback(
    (bx: number | null, by: number | null) => {
      if (!bx || !by) return true;
      const ux = uniformCuts(bx, cutsX.length + 1);
      const uy = uniformCuts(by, cutsY.length + 1);
      return ux.every((v, i) => v === cutsX[i]) && uy.every((v, i) => v === cutsY[i]);
    },
    [cutsX, cutsY]
  );

  const handleFile = useCallback(
    async (newFile: File) => {
      if (!newFile.type.startsWith('image/')) {
        toast.error('Please choose an image file.');
        return;
      }
      const loadId = ++loadIdRef.current;
      try {
        const buffer = await newFile.arrayBuffer();
        const nextBitmap = await createImageBitmap(new Blob([buffer]), {
          imageOrientation: 'from-image',
        });
        // A newer load, reset or unmount happened while decoding
        if (loadId !== loadIdRef.current) {
          nextBitmap.close();
          return;
        }

        // Release previous image
        cleanupRef.current.bitmap?.close();
        if (cleanupRef.current.sourceUrl) URL.revokeObjectURL(cleanupRef.current.sourceUrl);

        const nextUrl = URL.createObjectURL(newFile);
        const gridCols = cutsX.length > 0 ? cutsX.length + 1 : 2;
        const gridRows = cutsY.length > 0 ? cutsY.length + 1 : 2;

        setBitmap(nextBitmap);
        setFile(newFile);
        setSourceUrl(nextUrl);
        setCutsX(uniformCuts(nextBitmap.width, gridCols));
        setCutsY(uniformCuts(nextBitmap.height, gridRows));
        setCustom(false);
        invalidateParts();
        setBaseName(sanitize(newFile.name.replace(/\.[^.]+$/, '')));
        cleanupRef.current = { bitmap: nextBitmap, sourceUrl: nextUrl, parts: [] };
      } catch (err) {
        toast.error(`Could not load this image: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    },
    [cutsX.length, cutsY.length, invalidateParts]
  );

  const setUniform = useCallback(
    (cols: number, rows: number) => {
      if (!bitmap) return;
      setCutsX(uniformCuts(bitmap.width, cols));
      setCutsY(uniformCuts(bitmap.height, rows));
      setCustom(false);
      invalidateParts();
    },
    [bitmap, invalidateParts]
  );

  const addCut = useCallback(
    (axis: Axis) => {
      if (!bitmap) return;
      const total = axis === 'x' ? bitmap.width : bitmap.height;
      const cuts = axis === 'x' ? cutsX : cutsY;
      if (cuts.length >= MAX_CUTS) return;
      const next = insertCut(total, cuts);
      if (!next) {
        toast.error('No room for another cut.');
        return;
      }
      if (axis === 'x') setCutsX(next);
      else setCutsY(next);
      setCustom(true);
      invalidateParts();
    },
    [bitmap, cutsX, cutsY, invalidateParts]
  );

  const removeLastCut = useCallback(
    (axis: Axis) => {
      const cuts = axis === 'x' ? cutsX : cutsY;
      if (cuts.length === 0) return;
      if (axis === 'x') setCutsX((prev) => prev.slice(0, -1));
      else setCutsY((prev) => prev.slice(0, -1));
      setCustom(true);
      invalidateParts();
    },
    [cutsX, cutsY, invalidateParts]
  );

  const removeCutAt = useCallback(
    (axis: Axis, idx: number) => {
      if (axis === 'x') setCutsX((prev) => prev.filter((_, i) => i !== idx));
      else setCutsY((prev) => prev.filter((_, i) => i !== idx));
      setCustom(true);
      invalidateParts();
    },
    [invalidateParts]
  );

  const setCutAt = useCallback(
    (axis: Axis, idx: number, pos: number, total: number) => {
      const setter = axis === 'x' ? setCutsX : setCutsY;
      setter((prev) => moveCut(prev, idx, pos, total));
    },
    []
  );

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, axis: Axis, idx: number) => {
    if (!bitmap || !previewBoxRef.current) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = previewBoxRef.current.getBoundingClientRect();
    const total = axis === 'x' ? bitmap.width : bitmap.height;
    const scale = total / Math.max(axis === 'x' ? rect.width : rect.height, 1);
    const startPoint = axis === 'x' ? e.clientX - rect.left : e.clientY - rect.top;
    const startPos = (axis === 'x' ? cutsX : cutsY)[idx];
    setDragging({ axis, idx });
    document.body.style.userSelect = 'none';
    let moved = false;

    const move = (ev: PointerEvent) => {
      const now = axis === 'x' ? ev.clientX - rect.left : ev.clientY - rect.top;
      if (now === startPoint) return;
      moved = true;
      setCutAt(axis, idx, startPos + (now - startPoint) * scale, total);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
      setDragging(null);
      // A plain click (or the first half of a double-click) must not discard split results
      if (!moved) return;
      setCustom(true);
      invalidateParts();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up, { once: true });
    el.addEventListener('pointercancel', up, { once: true });
  };

  // Keyboard equivalent of dragging: arrows move 1px (Shift: 10px), Delete removes the cut
  const onCutKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, axis: Axis, idx: number) => {
    if (!bitmap) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeCutAt(axis, idx);
      return;
    }
    const dir = ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[
      e.key
    ];
    if (!dir) return;
    e.preventDefault();
    const pos = (axis === 'x' ? cutsX : cutsY)[idx] + dir * (e.shiftKey ? 10 : 1);
    setCutAt(axis, idx, pos, axis === 'x' ? bitmap.width : bitmap.height);
    setCustom(true);
    invalidateParts();
  };

  // Regenerate cores for parts that weren't renamed manually; recompose names
  // whenever the pattern, base name or view-preset mode changes
  useEffect(() => {
    if (!parts.length) return;
    setParts((prev) =>
      prev.map((p) => {
        const core = p.customName ? p.core : genName(p, base, pattern);
        const name = composeName(core, p.preset, presetMode);
        return core === p.core && name === p.name ? p : { ...p, core, name };
      })
    );
  }, [base, pattern, presetMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportNames = (): string[] => {
    const used: Record<string, number> = {};
    return effectiveNames.map((name) => {
      let finalName = name;
      let k = 1;
      while (used[finalName]) {
        k++;
        finalName = name.replace(/(\.[^.]+)$/, `_${k}$1`);
      }
      used[finalName] = 1;
      return finalName;
    });
  };

  const runSplit = async () => {
    if (!bitmap || isSplitting) return;
    setIsSplitting(true);
    // Image replaced, reset, cuts changed or unmounted mid-split -> drop the stale tiles
    const splitGen = splitGenRef.current;
    const nextParts: SplitPart[] = [];
    const discard = () => nextParts.forEach((p) => URL.revokeObjectURL(p.url));
    try {
      const xs = allCuts(bitmap.width, cutsX);
      const ys = allCuts(bitmap.height, cutsY);
      let seq = 0;
      for (let r = 0; r < ys.length - 1; r++) {
        for (let c = 0; c < xs.length - 1; c++) {
          if (splitGenRef.current !== splitGen) return discard();
          seq++;
          const x = xs[c];
          const y = ys[r];
          const cw = xs[c + 1] - x;
          const ch = ys[r + 1] - y;
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported in this browser');
          ctx.drawImage(bitmap, x, y, cw, ch, 0, 0, cw, ch);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (!blob) throw new Error('Failed to encode a tile as PNG');
          const part: NameablePart = { seq, r, c };
          const gen = genName(part, base, pattern);
          nextParts.push({
            r,
            c,
            seq,
            blob,
            core: gen,
            name: gen,
            customName: false,
            preset: null,
            url: URL.createObjectURL(blob),
            w: cw,
            h: ch,
          });
        }
      }
      if (splitGenRef.current !== splitGen) return discard();
      invalidateParts();
      setParts(nextParts);
      toast.success(`Split into ${nextParts.length} parts`);
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    } catch (err) {
      discard();
      if (splitGenRef.current !== splitGen) return;
      toast.error(`Splitting failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const renamePart = (idx: number, value: string) => {
    const clean = value.replace(/[\\/:*?"<>|]/g, '').trim();
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        // A manual rename replaces any active view preset on this tile
        if (clean) {
          const core = `${clean}.png`;
          return { ...p, core, name: core, customName: true, preset: null };
        }
        const core = genName(p, base, pattern);
        return { ...p, core, name: core, customName: false, preset: null };
      })
    );
  };

  const applyPreset = (idx: number, value: string) => {
    const preset = (value || null) as PresetKey | null;
    setParts((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, preset, name: composeName(p.core, preset, presetMode) } : p
      )
    );
  };

  const resetAll = () => {
    loadIdRef.current++;
    cleanupRef.current.bitmap?.close();
    if (cleanupRef.current.sourceUrl) URL.revokeObjectURL(cleanupRef.current.sourceUrl);
    setBitmap(null);
    setFile(null);
    setSourceUrl('');
    setCutsX([]);
    setCutsY([]);
    setCustom(false);
    invalidateParts();
    setBaseName('image');
    setPattern('seq');
    setPresetMode('append');
    cleanupRef.current = { bitmap: null, sourceUrl: '', parts: [] };
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadZip = async () => {
    if (!parts.length) return;
    try {
      const names = exportNames();
      const zip = new JSZip();
      parts.forEach((p, i) => zip.file(names[i], p.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${base}_parts.zip`, { showToast: true });
    } catch (err) {
      toast.error(`ZIP failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const downloadAll = async () => {
    const names = exportNames();
    for (let i = 0; i < parts.length; i++) {
      downloadBlob(parts[i].blob, names[i]);
      if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    toast.success(`Downloaded ${parts.length} files`);
  };

  const duplicateNames = (() => {
    const counts: Record<string, number> = {};
    effectiveNames.forEach((n) => (counts[n] = (counts[n] || 0) + 1));
    return counts;
  })();

  const partCount = (cutsX.length + 1) * (cutsY.length + 1);
  const even = isEven(bitmap?.width ?? null, bitmap?.height ?? null);

  return (
    <ToolPageLayout
      title="Image Splitter"
      description="Split any image into a grid of lossless PNG tiles. Presets, draggable cut lines, custom filenames, and ZIP export — 100% in your browser."
      keywords="image splitter, split image, image grid cutter, photo splitter online, slice image into parts"
      canonicalUrl="/tools/image-splitter"
      pageTitle="Image Splitter | sLixTOOLS"
      pageDescription="Split images into grids or custom tiles online for free. Choose a preset or drag your own cut lines, rename every part, and download as individual PNGs or a ZIP. Nothing ever leaves your device."
      breadcrumbLabel="Image Splitter"
      belowTool={seoContent}
      faq={[
        {
          question: 'Does my image get uploaded to a server?',
          answer:
            'No. The whole splitting process runs in your browser using the canvas API. Your image is never sent anywhere — there is no upload step at all.',
        },
        {
          question: 'Which input formats are supported?',
          answer:
            'JPG, PNG, WebP, GIF, BMP and AVIF (depending on your browser). Every tile is exported as lossless PNG so no quality is lost.',
        },
        {
          question: 'How do I make custom cuts?',
          answer:
            'Use the + and - buttons next to Columns and Rows to add a cut in the widest gap or remove the last one, then drag any line on the preview to position it precisely. Double-click a line to remove it.',
        },
        {
          question: 'How many tiles can I create?',
          answer:
            'Up to 20 columns × 20 rows (19 cuts per axis), so 400 tiles at most. Grid presets go up to 3×4 = 12 parts with one click.',
        },
        {
          question: 'Can I change the file names after splitting?',
          answer:
            'Yes. The base name, the pattern and every single part can be changed after the split, without splitting again. If two parts end up with the same name, they are marked and the downloads get _2, _3 suffixes.',
        },
        {
          question: 'Can I name tiles after character views like Front View?',
          answer:
            'Yes — every tile has a view preset dropdown (Front View, Back View, Left View, Right View). Choose whether the preset text is added to the existing filename or replaces it, then download individually or as a ZIP.',
        },
      ]}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Clear so re-picking the same file (e.g. after a failed load) fires onChange again
          e.target.value = '';
          if (f) handleFile(f);
        }}
      />

      <div
        className={toolWorkspace}
        onDragOver={(e) => {
          e.preventDefault();
          setWsDragging(true);
        }}
        onDragLeave={() => setWsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setWsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <div className={toolbarRow}>
          {file && bitmap ? (
            <div className="flex min-w-0 items-center gap-2">
              <img src={sourceUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-md border border-white/10 object-cover" />
              <div className="min-w-0 max-w-40">
                <p className="mt-0 truncate text-xs font-medium text-white">{file.name}</p>
                <p className="mt-0 truncate text-[11px] text-slate-400">
                  {bitmap.width} × {bitmap.height} px · {formatBytes(file.size)}
                </p>
              </div>
              <Tooltip label="Replace image" hint="Keeps your column and row count." side="bottom">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Replace image"
                  className={toolButton}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip label="Start over" hint="Removes the image and all parts." side="bottom">
                <button type="button" onClick={resetAll} aria-label="Start over with a new image" className={toolButton}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className={chipButton}>
              <Upload className="h-4 w-4 text-sky-300" aria-hidden="true" />
              Upload image
            </button>
          )}

          <fieldset disabled={!bitmap} className="flex min-w-0 grow basis-full flex-wrap items-center gap-x-4 gap-y-2 lg:basis-0">
            <div role="group" aria-label="Grid presets" className={segmentGroup}>
              {PRESETS.map((p) => (
                <button
                  key={`${p.cols}x${p.rows}`}
                  type="button"
                  onClick={() => setUniform(p.cols, p.rows)}
                  aria-pressed={!custom && p.cols === cutsX.length + 1 && p.rows === cutsY.length + 1}
                  className={segmentButton}
                >
                  {p.cols}&times;{p.rows}
                </button>
              ))}
            </div>
            <Stepper
              label="Columns"
              unit="column"
              value={cutsX.length + 1}
              onAdd={() => addCut('x')}
              onRemove={() => removeLastCut('x')}
              canAdd={cutsX.length < MAX_CUTS}
              canRemove={cutsX.length > 0}
            />
            <Stepper
              label="Rows"
              unit="row"
              value={cutsY.length + 1}
              onAdd={() => addCut('y')}
              onRemove={() => removeLastCut('y')}
              canAdd={cutsY.length < MAX_CUTS}
              canRemove={cutsY.length > 0}
            />
            <Tooltip label={`Line color: ${lineColor.name}`} hint={`Click to switch to ${LINE_COLORS[nextLineColorIndex].name}.`} side="bottom">
              <button
                type="button"
                onClick={() => setLineColorIndex(nextLineColorIndex)}
                aria-label={`Cut line color: ${lineColor.name}. Switch to ${LINE_COLORS[nextLineColorIndex].name}`}
                className={toolButton}
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-white/50"
                  style={{ backgroundColor: lineColor.value }}
                />
              </button>
            </Tooltip>
            {custom && (
              <Tooltip label="Reset even" hint="Keeps the count and spaces all cuts evenly." side="bottom">
                <button
                  type="button"
                  onClick={() => setUniform(cutsX.length + 1, cutsY.length + 1)}
                  className={chipButton}
                >
                  <Equal className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  Reset even
                </button>
              </Tooltip>
            )}
            <button type="button" onClick={runSplit} disabled={isSplitting} className={`${primaryButton} lg:ml-auto`}>
              <Scissors className="h-4 w-4" aria-hidden="true" />
              {isSplitting ? 'Splitting…' : 'Split image'}
            </button>
          </fieldset>
        </div>

        {!bitmap ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Upload an image by dropping a file here or pressing Enter to browse"
            className={cn(
              'mx-auto my-4 flex min-h-[50dvh] w-[calc(100%-2rem)] max-w-[54rem] flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center cursor-pointer transition-colors',
              wsDragging
                ? 'border-sky-400 bg-sky-400/10'
                : 'border-white/10 bg-white/[0.02] hover:border-sky-400/40 hover:bg-white/[0.04]'
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-400/10 text-sky-400">
              <ImagePlus className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-0 text-lg font-semibold text-white">Drop an image here</p>
            <p className="mt-0 text-sm text-slate-400">
              Adjust the grid, drag the cut lines freely, export lossless PNGs
            </p>
            <p className="mt-0 text-xs font-mono tracking-widest text-slate-500">
              JPG · PNG · WEBP · GIF · BMP · AVIF
            </p>
          </div>
        ) : (
          <>
            {/* The size container lets the preview fit both axes while keeping the image's aspect ratio */}
            <div className="flex min-h-0 flex-1 items-center justify-center p-4 lg:[container-type:size]">
              <div
                ref={previewBoxRef}
                className="relative w-full select-none overflow-hidden rounded-lg lg:w-[min(100cqw,calc(100cqh*var(--preview-ratio)))]"
                style={
                  {
                    aspectRatio: `${bitmap.width} / ${bitmap.height}`,
                    '--preview-ratio': bitmap.width / bitmap.height,
                  } as CSSProperties
                }
              >
                <img
                  src={sourceUrl}
                  alt="Image preview with draggable split lines"
                  className="block h-full w-full"
                  draggable={false}
                />
                <div className="absolute inset-0">
                  {/* Cells */}
                  {(() => {
                    const xs = allCuts(bitmap.width, cutsX);
                    const ys = allCuts(bitmap.height, cutsY);
                    const cells = [];
                    let i = 0;
                    for (let r = 0; r < ys.length - 1; r++) {
                      for (let c = 0; c < xs.length - 1; c++) {
                        i++;
                        const idx = i;
                        const w = xs[c + 1] - xs[c];
                        const h = ys[r + 1] - ys[r];
                        cells.push(
                          <div
                            key={`cell-${r}-${c}`}
                            title={`Part ${idx} — ${w} × ${h}px`}
                            className="absolute pointer-events-none ring-1 ring-inset ring-white/20"
                            style={{
                              left: `${(xs[c] / bitmap.width) * 100}%`,
                              top: `${(ys[r] / bitmap.height) * 100}%`,
                              width: `${(w / bitmap.width) * 100}%`,
                              height: `${(h / bitmap.height) * 100}%`,
                            }}
                          >
                            <span className="absolute top-1 left-1 px-1 rounded bg-black/60 text-sky-200 text-[10px] font-medium leading-4 backdrop-blur-sm">
                              {idx}
                            </span>
                          </div>
                        );
                      }
                    }
                    return cells;
                  })()}

                  {/* Cut lines */}
                  {cutsX.map((pos, idx) => (
                    <div
                      key={`x-${idx}-${cutsX.length}`}
                      onPointerDown={(e) => startDrag(e, 'x', idx)}
                      onDoubleClick={() => removeCutAt('x', idx)}
                      onKeyDown={(e) => onCutKeyDown(e, 'x', idx)}
                      role="slider"
                      tabIndex={0}
                      aria-orientation="horizontal"
                      aria-label={`Vertical cut ${idx + 1}`}
                      aria-valuenow={pos}
                      aria-valuemin={0}
                      aria-valuemax={bitmap.width}
                      className={cn(
                        'absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-col-resize group/line outline-none focus-visible:bg-sky-400/25',
                        dragging?.axis === 'x' && dragging.idx === idx ? 'z-20' : 'z-10'
                      )}
                      style={{ left: `${(pos / bitmap.width) * 100}%` }}
                    >
                      <div
                        className={cn(
                          'absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all',
                          dragging?.axis === 'x' && dragging.idx === idx ? 'w-0.5' : 'w-px group-hover/line:w-0.5'
                        )}
                        style={{ backgroundColor: lineColor.value }}
                      />
                      <span className="absolute top-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-slate-950/85 border border-white/10 text-sky-300 text-[10px] font-mono leading-4 pointer-events-none">
                        {pos}px
                      </span>
                    </div>
                  ))}
                  {cutsY.map((pos, idx) => (
                    <div
                      key={`y-${idx}-${cutsY.length}`}
                      onPointerDown={(e) => startDrag(e, 'y', idx)}
                      onDoubleClick={() => removeCutAt('y', idx)}
                      onKeyDown={(e) => onCutKeyDown(e, 'y', idx)}
                      role="slider"
                      tabIndex={0}
                      aria-orientation="vertical"
                      aria-label={`Horizontal cut ${idx + 1}`}
                      aria-valuenow={pos}
                      aria-valuemin={0}
                      aria-valuemax={bitmap.height}
                      className={cn(
                        'absolute left-0 right-0 h-4 -translate-y-1/2 cursor-row-resize group/line outline-none focus-visible:bg-sky-400/25',
                        dragging?.axis === 'y' && dragging.idx === idx ? 'z-20' : 'z-10'
                      )}
                      style={{ top: `${(pos / bitmap.height) * 100}%` }}
                    >
                      <div
                        className={cn(
                          'absolute inset-x-0 top-1/2 -translate-y-1/2 transition-all',
                          dragging?.axis === 'y' && dragging.idx === idx ? 'h-0.5' : 'h-px group-hover/line:h-0.5'
                        )}
                        style={{ backgroundColor: lineColor.value }}
                      />
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 px-1 rounded bg-slate-950/85 border border-white/10 text-sky-300 text-[10px] font-mono leading-4 pointer-events-none">
                        {pos}px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn(statusRow, 'justify-between gap-x-4 font-sans text-xs')}>
              <span>
                <b className="text-sky-300">{partCount}</b> parts
                {even
                  ? ` · ${Math.round(bitmap.width / (cutsX.length + 1))} × ${Math.round(bitmap.height / (cutsY.length + 1))} px each`
                  : ' · custom layout'}
                {dragging && ` · cut at ${(dragging.axis === 'x' ? cutsX[dragging.idx] : cutsY[dragging.idx]) ?? 0} px`}
              </span>
              <span>Drag a line to move the cut · double-click a line to remove it</span>
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {parts.length > 0 && (
        <div ref={resultsRef} className="space-y-4 border-t border-white/10 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-semibold text-white">
              Split parts <span className="font-normal text-slate-400">({parts.length})</span>
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Base name
              <input
                type="text"
                spellCheck={false}
                autoComplete="off"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value.replace(/[\\/:*?"<>|]/g, ''))}
                className={`${fieldClass} !w-40`}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Pattern
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value as PatternMode)}
                className={`${fieldClass} !w-auto`}
              >
                <option value="seq">Sequential — 01, 02, 03…</option>
                <option value="grid">Row &amp; column — r01c01, r01c02…</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">View presets</span>
              <div role="group" aria-label="View preset naming mode" className={segmentGroup}>
                <Tooltip label="Add to name" hint={`${base}_${pattern === 'seq' ? '01' : 'r01c01'}_Front View.png`} side="bottom">
                  <button
                    type="button"
                    aria-pressed={presetMode === 'append'}
                    onClick={() => setPresetMode('append')}
                    className={segmentButton}
                  >
                    Add to name
                  </button>
                </Tooltip>
                <Tooltip label="Replace name" hint="Front View.png" side="bottom">
                  <button
                    type="button"
                    aria-pressed={presetMode === 'replace'}
                    onClick={() => setPresetMode('replace')}
                    className={segmentButton}
                  >
                    Replace name
                  </button>
                </Tooltip>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setParts((prev) =>
                  prev.map((p) => {
                    const name = genName(p, base, pattern);
                    return { ...p, customName: false, preset: null, core: name, name };
                  })
                )
              }
              className={chipButton}
            >
              Reset names
            </button>
            <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
              <button type="button" onClick={downloadZip} className={primaryButton}>
                <Archive className="h-4 w-4" aria-hidden="true" />
                Download ZIP
              </button>
              <button type="button" onClick={downloadAll} className={chipButton}>
                <Download className="h-4 w-4 text-sky-300" aria-hidden="true" />
                Individually
              </button>
              <button type="button" onClick={resetAll} className={chipButton}>
                <ImageIcon className="h-4 w-4 text-sky-300" aria-hidden="true" />
                New image
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
            {parts.map((p, i) => {
              const isDup = duplicateNames[effectiveNames[i]] > 1;
              return (
                <div
                  key={`${p.r}-${p.c}-${p.seq}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex flex-col gap-2"
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-24 object-contain rounded-md bg-black/30"
                  />
                  <div className="flex items-center">
                    <input
                      value={edit && edit.idx === i ? edit.value : p.name.replace(/\.png$/, '')}
                      spellCheck={false}
                      autoComplete="off"
                      aria-label={`Filename for part ${i + 1}`}
                      onFocus={(e) => {
                        e.currentTarget.select();
                        setEdit({ idx: i, value: p.name.replace(/\.png$/, '') });
                      }}
                      onChange={(e) =>
                        setEdit({ idx: i, value: e.target.value.replace(/[\\/:*?"<>|]/g, '') })
                      }
                      onBlur={() => {
                        if (edit && edit.idx === i) renamePart(i, edit.value);
                        setEdit(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      title={
                        isDup
                          ? 'Duplicate filename — downloads get _2, _3… suffixes'
                          : undefined
                      }
                      className={cn(
                        'min-w-0 flex-1 px-2 py-1 rounded-l-md bg-black/30 border text-xs text-white focus:outline-none transition-colors',
                        isDup
                          ? 'border-amber-400/60 focus:border-amber-300'
                          : 'border-white/10 focus:border-sky-400/60'
                      )}
                    />
                    <span className="px-2 py-1 rounded-r-md border border-l-0 border-white/10 bg-black/30 text-xs text-slate-500">
                      .png
                    </span>
                  </div>
                  <select
                    value={p.preset ?? ''}
                    onChange={(e) => applyPreset(i, e.target.value)}
                    aria-label={`View preset for part ${i + 1}`}
                    className={cn(
                      'w-full px-2 py-1 rounded-md bg-black/30 border text-xs focus:outline-none transition-colors cursor-pointer',
                      p.preset
                        ? 'border-sky-400/40 text-sky-300'
                        : 'border-white/10 text-slate-400 hover:text-slate-300 focus:border-sky-400/60'
                    )}
                  >
                    <option value="">No view preset</option>
                    {(Object.keys(PRESET_LABELS) as PresetKey[]).map((k) => (
                      <option key={k} value={k}>
                        {PRESET_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 truncate">
                      {p.w} × {p.h} · {formatBytes(p.blob.size)}
                    </span>
                    <Tooltip label="Download this part">
                      <button
                        type="button"
                        onClick={() => downloadBlob(p.blob, exportNames()[i])}
                        className="p-1.5 rounded-md border border-white/10 text-slate-400 enabled:hover:text-sky-300 enabled:hover:border-sky-400/40 transition-colors flex-shrink-0"
                        aria-label={`Download ${p.name}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
};

export default ImageSplitter;
