import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  Blend,
  ChevronRight,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  Crosshair,
  Download,
  Drum,
  Eraser,
  Flag,
  FlipHorizontal2,
  Focus,
  Keyboard,
  Layers,
  History,
  Command,
  Power,
  Rainbow,
  Star,
  LocateFixed,
  Magnet,
  AlignStartVertical,
  Wrench,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  Repeat2,
  RotateCcw,
  Save,
  ScanSearch,
  Scissors,
  Shrink,
  SkipBack,
  SkipForward,
  Snowflake,
  StepBack,
  StepForward,
  TrendingDown,
  TrendingUp,
  Undo2,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
  ZoomIn,
  ZoomOut,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SettingSlider from '@/components/tools/SettingSlider';
import EqCurve, { FilterCurve } from '@/components/tools/EqCurve';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { useHistory } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  alignOverlap,
  audibleRange,
  autoCrossfade,
  autoFire,
  clipEnd,
  computePeaks,
  spectrogram,
  copyRange,
  cutClips,
  deleteTrackRange,
  distance,
  editTrackRange,
  encodeWav,
  environment,
  ENVIRONMENT_NAMES,
  equalize,
  extendLoop,
  fade,
  fadeCurve,
  findLoopEnd,
  fireLoop,
  fromAudioBuffer,
  fxActive,
  gain,
  GATE_OFF,
  glue,
  insertIntoTrack,
  keepRange,
  limit,
  loudness,
  makeLoop,
  MECH_KINDS,
  mechSound,
  moveClips,
  moveRange,
  NO_FX,
  noise,
  normalize,
  onsetOf,
  pasteClips,
  pitchShift,
  pcmDuration,
  pcmLength,
  processTrack,
  renderClips,
  resizeClip,
  reverse,
  silence,
  splitAt,
  suppress,
  sweep,
  texture,
  toMono,
  trackEnd,
  truePeak,
  trackStart,
  tracksLength,
  withFxDefaults,
  type Clip,
  type Environment,
  type Fade,
  type GlueSettings,
  type MechKind,
  type NoiseColor,
  type Pcm,
  type ReverbSettings,
  type Slope,
  type Track,
  type TrackFx,
} from '@/utils/audioEdit';
import { AUDIO_MIME, audioCodecArgs, withFFmpeg, type AudioFormat } from '@/utils/ffmpeg';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '@/utils/fileValidation';
import { formatFileSize, formatTimecode } from '@/utils/formatters';
import { downloadBlob } from '@/utils/download';
import { toFile, useHandoff } from '@/utils/handoff';
import {
  chipButton,
  editorWorkspace,
  guideCard,
  guideHeading,
  guideKey,
  primaryButton,
  sectionLabel,
  segmentButton,
  segmentGroup,
  toolButton,
  toolDropzone,
  editorFeatures,
  toolbarRow,
} from '@/styles/constants';

const ACCEPTED = [...new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS])];
const FORMATS: { value: AudioFormat; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'ogg', label: 'OGG' },
  { value: 'flac', label: 'FLAC' },
  { value: 'm4a', label: 'M4A' },
];
const BITRATES = [128, 192, 256, 320];
const LOSSY: AudioFormat[] = ['mp3', 'ogg', 'm4a'];
const GLUE_DEFAULT: GlueSettings = {
  threshold: -18,
  ratio: 4,
  attack: 10,
  release: 200,
  makeup: 4,
  mix: 1,
};
const GLUE_RATIOS = [2, 4, 10];
const GLUE_ATTACKS = [0.1, 0.3, 1, 3, 10, 30];
const GLUE_RELEASES = [100, 200, 400, 600, 800, 1200];
const SLOPES: Slope[] = [12, 24, 48];
/** Everything but the amount, which stays as it is */
const REVERB_PRESETS: { name: string; set: Omit<ReverbSettings, 'mix'> }[] = [
  {
    name: 'Small room',
    set: { decay: 0.4, preDelay: 0, size: 0.5, early: 0.8, tail: 0.7, damping: 0.4, diffusion: 0.7, lowCut: 150, highCut: 8000, width: 0.8 },
  },
  {
    name: 'Indoor range',
    set: { decay: 1.2, preDelay: 8, size: 0.9, early: 1, tail: 0.8, damping: 0.15, diffusion: 0.5, lowCut: 100, highCut: 10000, width: 1 },
  },
  {
    name: 'Hall',
    set: { decay: 2.5, preDelay: 25, size: 1.4, early: 0.5, tail: 1, damping: 0.35, diffusion: 0.8, lowCut: 80, highCut: 9000, width: 1 },
  },
  {
    name: 'Street',
    set: { decay: 0.9, preDelay: 70, size: 1.7, early: 1, tail: 0.4, damping: 0.3, diffusion: 0.3, lowCut: 150, highCut: 7000, width: 1 },
  },
  {
    name: 'Open field',
    set: { decay: 2, preDelay: 120, size: 2, early: 0.15, tail: 0.7, damping: 0.6, diffusion: 0.9, lowCut: 200, highCut: 4500, width: 1 },
  },
  {
    name: 'Plate',
    set: { decay: 1.5, preDelay: 0, size: 0.6, early: 0, tail: 1, damping: 0.1, diffusion: 1, lowCut: 0, highCut: 0, width: 1 },
  },
];
/** Hz; 0 = the project rate */
const CRUSH_RATES = [0, 22050, 16000, 11025, 8000, 6000, 4000, 2000];
const LOOP_FADES = [10, 20, 50, 100, 200, 500];
/** Seconds a loop or texture is extended to */
const EXTEND_LENS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];
/** ms; texture grain size */
const GRAIN_SIZES = [100, 150, 250, 400, 600, 1000];
/** How far a dropped clip may be nudged to line up in phase with the clip it overlaps, s */
const ALIGN_MAX = 0.02;
const LUFS_TARGETS = [-12, -14, -16, -18, -20, -23];
const NOISE_COLORS: NoiseColor[] = ['white', 'pink', 'brown'];
const FX_DEFAULT = {
  loopMs: 50,
  extendLen: 30,
  grainMs: 250,
  noiseColor: 'white' as NoiseColor,
  /** Seconds, of a noise burst or a thump */
  genLen: 0.5,
  thumpFrom: 150,
  thumpTo: 40,
  /** Rounds per minute */
  fireRate: 600,
  fireShots: 8,
  mechKind: 'bolt' as MechKind,
};
const MECH_LABELS: Record<MechKind, string> = { bolt: 'Bolt', click: 'Click', mag: 'Mag', shell: 'Shell' };
const PLACE_LABELS: Record<Environment, string> = { field: 'Field', city: 'City', canyon: 'Canyon', indoor: 'Indoor' };
/** One variation's random pitch (semitones), volume and tone tilt (dB) */
type Take = { st: number; db: number; tone: number };
/** Hz; 0 = the project's own rate */
const EXPORT_RATES = [0, 48000, 44100, 22050];
/** File name tag and `distance` amount of the versions an export can hold */
const DISTANCES: [string, number][] = [
  ['close', 0],
  ['mid', 0.5],
  ['far', 1],
];
const ONE_DISTANCE: [string, number][] = [['', 0]];
/** The layers a weapon sound is built from, each with the effects its job starts with */
const WEAPON_LAYERS: [string, Partial<TrackFx>][] = [
  ['Transient', { lowCut: 1200, attack: 6 }],
  ['Body', { lowCut: 100, highCut: 9000, drive: 3 }],
  ['Mech', { lowCut: 600, volume: -6 }],
  ['Tail', { lowCut: 150, reverb: { ...NO_FX.reverb, mix: 0.4, decay: 2, preDelay: 60, size: 1.7 } }],
  ['Sub', { highCut: 120, highSlope: 48 }],
];
const PRESETS_KEY = 'audio-editor:fx-presets';
const FAVORITES_KEY = 'audio-editor:fx-favorites';
type FxPresets = Record<string, Partial<TrackFx>>;
const hz = (v: number) => (v >= 1000 ? `${v / 1000} kHz` : `${v} Hz`);
/** Decoded audio kept in memory across all undo steps */
const MEMORY_BUDGET = 800 * 1024 * 1024;
const MAX_ZOOM = 64;
const MAX_CANVAS = 16384;
/** Ruler tick spacing candidates in seconds; the first one at least MIN_TICK_PX wide wins */
const RULER_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const MIN_TICK_PX = 80;
const RULER_H = 28;
const ADD_ROW_H = 40;
const MIN_LANE_H = 88;
const WAVE = '#38bdf8';
const WAVE_DIM = 'rgba(56,189,248,0.4)';
const WAVE_SELECTED = '#bae6fd';
const WAVE_MUTED = 'rgba(148,163,184,0.35)';
const CLIP_BG = 'rgba(56,189,248,0.06)';
const CLIP_EDGE = 'rgba(56,189,248,0.35)';
const FADE_SHADE = 'rgba(2,6,23,0.55)';
const FADE_LINE = '#fbbf24';

/** A time range in seconds on one track */
interface Selection {
  track: number;
  start: number;
  end: number;
}
interface Project {
  sampleRate: number;
  tracks: Track[];
  /** seconds, sorted */
  markers?: number[];
  /** the button that made this undo step, for the history list */
  label?: string;
}
const NO_TRACKS: Track[] = [];
const NO_MARKERS: number[] = [];
type FadeEdge = 'in' | 'out';
type FadeDrag = {
  mode: 'fade';
  track: number;
  clip: number;
  edge: FadeEdge;
  part: 'length' | 'curve';
};
/** What a move drag carries: lane index, start and length in seconds */
type MoveItem = { lane: number; at: number; len: number };
type Drag =
  | { mode: 'select'; anchor: number }
  /** clips: dragged by a header (one, or every picked clip); absent = the selection is dragged. at/lanes: where it would land */
  | {
      mode: 'move';
      grab: number;
      x: number;
      y: number;
      moved: boolean;
      clips?: Clip[] | undefined;
      /** Ctrl was held on the header: a click without moving picks or unpicks this clip */
      toggle?: Clip | undefined;
      items: MoveItem[];
      lane0: number;
      start: number;
      len: number;
      at: number;
      lanes: number;
    }
  | FadeDrag
  | { mode: 'trim'; track: number; index: number; edge: 'start' | 'end' }
  | { mode: 'gain'; track: number; index: number; y: number; db: number }
  | { mode: 'marquee'; t0: number; y0: number }
  | { mode: 'loop'; part: 'start' | 'end' | 'body'; grab: number }
  | { mode: 'marker'; index: number; x: number; moved: boolean }
  /** Ruler held and dragged up or down: zooms around focus (seconds), kept at anchor px in the view */
  | { mode: 'zoom'; y: number; zoom: number; focus: number; anchor: number };
/** Copied audio: clips relative to the copied range's start */
interface Clipboard {
  clips: Clip[];
  length: number;
}
/** Clip header strip: drag it to move the clip */
const CLIP_HEAD_H = 14;
/** Snapping pulls within this many pixels */
const SNAP_PX = 8;
const panText = (p: number) => (p === 0 ? 'C' : p < 0 ? `L${-p}` : `R${p}`);

/** A copy without these keys (optional props can't be set to undefined here) */
const omit = <T extends object, K extends keyof T>(o: T, ...keys: K[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>;
const fadeKey = (edge: FadeEdge) => (edge === 'in' ? 'fadeIn' : 'fadeOut');
const withFade = (track: Track, clip: number, edge: FadeEdge, fade: Fade): Track => ({
  ...track,
  clips: track.clips.map((c, i) => (i === clip ? { ...c, [fadeKey(edge)]: fade } : c)),
});
/** The curve whose midpoint gain is g, so the curve dot follows the pointer */
const curveThrough = (g: number) => {
  const k = Math.log(Math.min(0.99, Math.max(0.01, g >= 0.5 ? 1 - g : g))) / Math.log(0.5);
  return Math.max(-1, Math.min(1, ((k - 1) / 3) * (g >= 0.5 ? 1 : -1)));
};

let audioContext: AudioContext | null = null;
const getContext = () => (audioContext ??= new AudioContext());

let nextTrackId = 1;
const newTrack = (clips: Clip[] = []): Track => ({ id: nextTrackId++, clips });

const toBuffer = (ctx: BaseAudioContext, pcm: Pcm) => {
  const buffer = ctx.createBuffer(pcm.channels.length, Math.max(1, pcmLength(pcm)), pcm.sampleRate);
  pcm.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
  return buffer;
};

/** The audio at another sample rate, resampled by the browser. Rate 0 keeps it as it is. */
const resample = async (pcm: Pcm, rate: number): Promise<Pcm> => {
  if (!rate || rate === pcm.sampleRate) return pcm;
  const ctx = new OfflineAudioContext(
    pcm.channels.length,
    Math.max(1, Math.round(pcmDuration(pcm) * rate)),
    rate
  );
  const src = ctx.createBufferSource();
  src.buffer = toBuffer(ctx, pcm);
  src.connect(ctx.destination);
  src.start();
  return fromAudioBuffer(await ctx.startRendering());
};

const decode = async (file: File): Promise<Pcm> => {
  try {
    return fromAudioBuffer(await getContext().decodeAudioData(await file.arrayBuffer()));
  } catch {
    throw new Error(`${file.name} has no sound this browser can decode`);
  }
};

const pcmBytes = (pcm: Pcm) => pcmLength(pcm) * pcm.channels.length * 4;
const historyLimitFor = (bytes: number) =>
  Math.max(3, Math.min(30, Math.floor(MEMORY_BUDGET / bytes)));
const signed = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v} ${unit}`;

/** Every enabled button of the last render, for the command palette: label → what it does */
const commands = new Map<string, { run: () => void; shortcut?: string | undefined }>();
/** The button being clicked: the undo step it makes is named after it */
let actionLabel: string | null = null;
const labelled = (label: string, fn: () => void, disabled?: boolean, shortcut?: string) => {
  const run = () => {
    actionLabel = label.split(':')[0];
    try {
      fn();
    } finally {
      actionLabel = null;
    }
  };
  if (!disabled) commands.set(label, { run, shortcut });
  return run;
};

const iconBtn = (
  label: string,
  onClick: () => void,
  Icon: typeof Play,
  opts: { disabled?: boolean; shortcut?: string; pressed?: boolean } = {}
) => (
  <Tooltip label={label} shortcut={opts.shortcut}>
    <button
      type="button"
      aria-label={label}
      aria-pressed={opts.pressed}
      disabled={opts.disabled}
      onClick={labelled(label, onClick, opts.disabled, opts.shortcut)}
      className={toolButton}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  </Tooltip>
);

const actionBtn = (
  label: string,
  onClick: () => void,
  Icon: typeof Play,
  disabled = false,
  hint?: string
) => {
  const button = (
    <button
      type="button"
      onClick={labelled(label, onClick, disabled)}
      disabled={disabled}
      className={cn(chipButton, 'w-full justify-start')}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
  return hint ? <Tooltip label={hint}>{button}</Tooltip> : button;
};

/** Slider over a fixed list of values */
const listSlider = (
  label: string,
  list: number[],
  value: number,
  onChange: (v: number) => void,
  text: (v: number) => string,
  disabled: boolean
) => (
  <SettingSlider
    label={label}
    value={list.indexOf(value)}
    valueText={text(value)}
    onChange={(i) => onChange(list[i] ?? value)}
    min={0}
    max={list.length - 1}
    step={1}
    disabled={disabled}
  />
);

/** Exact-value field beside a slider. Commits on Enter or blur, so a half-typed number isn't clamped. */
const NumberField = ({
  label,
  value,
  unit,
  min,
  max,
  onCommit,
  empty,
  disabled,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onCommit: (v: number) => void;
  /** Shown for 0; with it, clearing the field commits 0 */
  empty?: string | undefined;
  disabled: boolean;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (!draft.trim()) {
      if (empty) onCommit(0);
    } else if (Number.isFinite(v)) onCommit(Math.max(min, Math.min(max, Math.round(v))));
    setDraft(null);
  };
  return (
    <span className="flex items-baseline gap-1 font-mono text-[11px] tabular-nums text-slate-200">
      <input
        type="number"
        aria-label={label}
        value={draft ?? (value || '')}
        placeholder={empty}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-16 rounded border border-white/10 bg-slate-950 px-1 py-0.5 text-right placeholder:text-slate-500 focus:border-sky-400 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {unit}
    </span>
  );
};

const FREQ_STEPS = 240;
/** Log-scale frequency slider (3 % steps) with a field for the exact Hz. With `off`, 0 Hz = off sits at that end. */
const freqSlider = (
  label: string,
  value: number,
  onChange: (v: number) => void,
  disabled: boolean,
  off?: 'min' | 'max',
  [lo, hi]: [number, number] = [20, 20000]
) => {
  const first = off === 'min' ? 1 : 0;
  const last = first + FREQ_STEPS;
  const offPos = off === 'min' ? 0 : last + 1;
  return (
    <SettingSlider
      label={label}
      value={value ? first + Math.round((Math.log(value / lo) / Math.log(hi / lo)) * FREQ_STEPS) : offPos}
      valueText={value ? hz(value) : 'Off'}
      field={
        <NumberField
          label={`${label} in Hz`}
          value={value}
          unit="Hz"
          min={lo}
          max={hi}
          onCommit={onChange}
          empty={off && 'Off'}
          disabled={disabled}
        />
      }
      onChange={(pos) =>
        onChange(
          off && pos === offPos ? 0 : Number((lo * (hi / lo) ** ((pos - first) / FREQ_STEPS)).toPrecision(3))
        )
      }
      min={0}
      max={off === 'max' ? last + 1 : last}
      step={1}
      disabled={disabled}
    />
  );
};

/** Collapsible panel section, one open at a time */
/** A starred group moves to the top */
const fxGroup = (
  title: string,
  note: string,
  children: React.ReactNode,
  fav?: { on: boolean; toggle: () => void }
) => (
  <details
    name="fx"
    className="group [&>summary::-webkit-details-marker]:hidden"
    style={fav?.on ? { order: -1 } : undefined}
  >
    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2">
      <span className={cn(sectionLabel, 'mt-0 inline-flex items-center gap-1')}>
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {title}
        {fav && (
          <button
            type="button"
            aria-label={fav.on ? `Unstar ${title}` : `Star ${title}: keep it at the top`}
            aria-pressed={fav.on}
            title={fav.on ? 'Starred: stays at the top' : 'Star: keep it at the top'}
            onClick={(e) => {
              e.preventDefault();
              fav.toggle();
            }}
            className={cn(
              'ml-0.5 rounded p-0.5 hover:text-amber-200',
              fav.on ? 'text-amber-300' : 'text-slate-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            )}
          >
            <Star className={cn('h-3 w-3', fav.on && 'fill-current')} aria-hidden="true" />
          </button>
        )}
      </span>
      <span className="text-[11px] text-slate-500">{note}</span>
    </summary>
    <div className="space-y-2 pt-2">{children}</div>
  </details>
);

const panelSection = (title: string, note: string, children: React.ReactNode) => (
  <section className="space-y-2">
    <div className="flex items-baseline justify-between gap-2">
      <p className={cn(sectionLabel, 'mt-0')}>{title}</p>
      <span className="text-[11px] text-slate-500">{note}</span>
    </div>
    {children}
  </section>
);

const sidePanel =
  'min-w-0 space-y-5 border-t border-white/10 p-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0';

/** On/off switch remembered per browser */
const useStoredToggle = (key: string, initial = true) => {
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : v === '1';
    } catch {
      return initial;
    }
  });
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? '0' : '1');
      } catch {
        // storage blocked: the choice lasts for this visit
      }
      return !o;
    });
  return [open, toggle] as const;
};

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

// Peaks per clip audio, so dragging a fade doesn't rescan the waveform
const peakCache = new WeakMap<Pcm, { w: number; peaks: Float32Array }>();
const peaksOf = (pcm: Pcm, w: number) => {
  const hit = peakCache.get(pcm);
  if (hit?.w === w) return hit.peaks;
  const peaks = computePeaks(pcm, 0, pcmLength(pcm), w);
  peakCache.set(pcm, { w, peaks });
  return peaks;
};

const SPEC_BANDS = 96;
/** Dark blue through violet and orange to pale yellow: quiet to loud */
const SPEC_COLORS = (() => {
  const stops = [
    [2, 6, 23],
    [49, 18, 99],
    [140, 34, 120],
    [235, 90, 60],
    [252, 200, 80],
    [255, 250, 210],
  ];
  return Array.from({ length: 256 }, (_, i) => {
    const u = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(u));
    const f = u - k;
    return stops[k].map((a, c) => Math.round(a + (stops[k + 1][c] - a) * f));
  });
})();
/** A source's spectrogram as an image, one column per 256 samples (at most 2048), low bands at the bottom */
const specCache = new WeakMap<Pcm, HTMLCanvasElement>();
const spectrumOf = (pcm: Pcm) => {
  const hit = specCache.get(pcm);
  if (hit) return hit;
  const n = pcmLength(pcm);
  const cols = Math.max(1, Math.min(2048, Math.ceil(n / 256)));
  const spec = spectrogram(pcm, 0, n, cols, SPEC_BANDS);
  const img = new ImageData(cols, SPEC_BANDS);
  for (let c = 0; c < cols; c++)
    for (let b = 0; b < SPEC_BANDS; b++) {
      const [r, g, bl] = SPEC_COLORS[Math.round(spec[c * SPEC_BANDS + b] * 255)];
      const o = ((SPEC_BANDS - 1 - b) * cols + c) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = bl;
      img.data[o + 3] = 255;
    }
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = SPEC_BANDS;
  canvas.getContext('2d')?.putImageData(img, 0, 0);
  specCache.set(pcm, canvas);
  return canvas;
};

/**
 * One track's waveform, or its spectrogram. selStart/selEnd (seconds) highlight the selected part; equal when it
 * isn't on this track.
 */
const LaneCanvas = ({
  clips,
  sampleRate,
  span,
  width,
  height,
  muted,
  selStart,
  selEnd,
  spectrum,
}: {
  clips: Clip[];
  sampleRate: number;
  span: number;
  width: number;
  height: number;
  muted: boolean;
  selStart: number;
  selEnd: number;
  spectrum: boolean;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const px = (samples: number) => (samples / sampleRate / span) * width;
  const drawn = useMemo(
    () =>
      clips.map((c) => {
        // Peaks of the whole source, windowed: trimming and splitting don't rescan the audio
        const src = c.src ?? c.pcm;
        const full = Math.max(1, Math.round(px(pcmLength(src))));
        const skip = Math.min(full - 1, Math.round(px(c.offset ?? 0)));
        const w = Math.max(1, Math.min(full - skip, Math.round(px(pcmLength(c.pcm)))));
        return {
          x: Math.round(px(c.at)),
          w,
          src,
          // the clip's part of the source, 0..1
          from: (c.offset ?? 0) / pcmLength(src),
          part: pcmLength(c.pcm) / pcmLength(src),
          peaks: peaksOf(src, full).subarray(skip * 2, (skip + w) * 2),
          g: c.gain ? 10 ** (c.gain / 20) : 1,
          fadeIn: c.fadeIn,
          fadeOut: c.fadeOut,
        };
      }),
    [clips, sampleRate, span, width] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = width;
    canvas.height = height;
    const mid = height / 2;
    const amp = mid * 0.85;
    const bars = (color: string) => {
      ctx.fillStyle = color;
      for (const { x, w, peaks, g } of drawn) {
        const a = amp * g;
        for (let i = 0; i < w; i++)
          ctx.fillRect(
            x + i,
            mid - peaks[i * 2 + 1] * a,
            1,
            Math.max(1, (peaks[i * 2 + 1] - peaks[i * 2]) * a)
          );
      }
    };
    for (const { x, w } of drawn) {
      ctx.fillStyle = CLIP_BG;
      ctx.fillRect(x, 0, w, height);
      ctx.fillStyle = CLIP_EDGE;
      ctx.fillRect(x, 0, 1, height);
      ctx.fillRect(x + w - 1, 0, 1, height);
    }
    const selected = selEnd > selStart;
    if (spectrum) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = muted ? 0.35 : 1;
      for (const { x, w, src, from, part } of drawn) {
        const img = spectrumOf(src);
        ctx.drawImage(img, from * img.width, 0, Math.max(1, part * img.width), img.height, x, 0, w, height);
      }
      ctx.globalAlpha = 1;
      if (selected) {
        const a = (selStart / span) * width;
        ctx.fillStyle = 'rgba(186,230,253,0.18)';
        ctx.fillRect(a, 0, (selEnd / span) * width - a, height);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(0, Math.round(mid), width, 1); // zero line
      bars(muted ? WAVE_MUTED : selected ? WAVE_DIM : WAVE);
    }
    if (selected && !muted && !spectrum) {
      const a = (selStart / span) * width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, 0, (selEnd / span) * width - a, height);
      ctx.clip();
      bars(WAVE_SELECTED);
      ctx.restore();
    }
    // Fades: the curve is the gain from silent (bottom) to full (top); what it cuts off is shaded
    const shade = (x0: number, w: number, gainAt: (u: number) => number) => {
      if (w < 1) return;
      ctx.beginPath();
      for (let j = 0; j <= w; j++) ctx.lineTo(x0 + j, height * (1 - gainAt(j / w)));
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0, 0);
      ctx.closePath();
      ctx.fillStyle = FADE_SHADE;
      ctx.fill();
      ctx.strokeStyle = FADE_LINE;
      ctx.stroke();
    };
    for (const { x, w, fadeIn, fadeOut } of drawn) {
      if (fadeIn) shade(x, px(fadeIn.length), (u) => fadeCurve(u, fadeIn.curve));
      if (fadeOut)
        shade(x + w - px(fadeOut.length), px(fadeOut.length), (u) =>
          fadeCurve(1 - u, fadeOut.curve)
        );
    }
  }, [drawn, width, height, span, muted, selStart, selEnd, spectrum]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
};

/**
 * The whole mix in one strip, with the part the timeline shows boxed. Click or drag to scroll there. Follows the
 * timeline's scrolling itself, so scrolling doesn't re-render the editor.
 */
const Overview = ({
  pcm,
  view,
  span,
  playhead,
  zoom,
}: {
  pcm: Pcm | null;
  view: React.RefObject<HTMLDivElement | null>;
  span: number;
  playhead: number;
  zoom: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = (canvas.width = canvas.clientWidth);
    const h = (canvas.height = canvas.clientHeight);
    ctx.clearRect(0, 0, w, h);
    if (!pcm) return;
    const len = Math.max(1, Math.round((pcmLength(pcm) / pcm.sampleRate / span) * w));
    const peaks = peaksOf(pcm, len);
    ctx.fillStyle = WAVE_DIM;
    for (let i = 0; i < len; i++) {
      const a = Math.max(Math.abs(peaks[i * 2]), Math.abs(peaks[i * 2 + 1])) * h * 0.45;
      ctx.fillRect(i, h / 2 - a, 1, Math.max(1, 2 * a));
    }
  }, [pcm, span]);
  useEffect(() => {
    const v = view.current;
    const box = boxRef.current;
    if (!v || !box) return;
    const sync = () => {
      box.style.left = `${(v.scrollLeft / v.scrollWidth) * 100}%`;
      box.style.width = `${(v.clientWidth / v.scrollWidth) * 100}%`;
    };
    sync();
    v.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      v.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [view, zoom]);
  const scrollTo = (e: React.PointerEvent) => {
    const v = view.current;
    if (!v || !(e.buttons & 1)) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.scrollLeft = ((e.clientX - r.left) / r.width) * v.scrollWidth - v.clientWidth / 2;
  };
  return (
    <div
      className="relative h-6 shrink-0 cursor-pointer touch-none border-b border-white/10 bg-slate-950"
      title="The whole mix: click or drag to scroll there"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrollTo(e);
      }}
      onPointerMove={scrollTo}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={boxRef}
        className="pointer-events-none absolute inset-y-0 rounded-sm border border-sky-300/70 bg-sky-300/10"
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-amber-300"
        style={{ left: `${(playhead / span) * 100}%` }}
      />
    </div>
  );
};

/** A modal over the page; Esc or a click outside closes it */
const Modal = ({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    else if (!open && d?.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-slate-900 p-0 text-slate-200 shadow-2xl backdrop:bg-black/60"
    >
      {open && children}
    </dialog>
  );
};

/** Type to find any button of the editor, Enter runs it */
const CommandPalette = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const found = [...commands].filter(([label]) => words.every((w) => label.toLowerCase().includes(w)));
  const run = (i: number) => {
    const hit = found[i];
    onClose();
    hit?.[1].run();
  };
  return (
    <div className="flex max-h-[70vh] flex-col">
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAt(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setAt((a) => Math.min(found.length - 1, a + 1));
          else if (e.key === 'ArrowUp') setAt((a) => Math.max(0, a - 1));
          else if (e.key === 'Enter') run(at);
          else return;
          e.preventDefault();
        }}
        placeholder="Type a command: reverb, loop, export…"
        aria-label="Command"
        className="border-b border-white/10 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-500"
      />
      <ul className="overflow-y-auto p-1" role="listbox" aria-label="Commands">
        {found.map(([label, { shortcut }], i) => (
          <li key={label} role="option" aria-selected={i === at}>
            <button
              type="button"
              ref={i === at ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
              onClick={() => run(i)}
              onMouseMove={() => setAt(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm',
                i === at ? 'bg-sky-500/20 text-sky-100' : 'text-slate-300'
              )}
            >
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {shortcut && <kbd className={guideKey}>{shortcut}</kbd>}
            </button>
          </li>
        ))}
        {!found.length && <li className="px-3 py-2 text-sm text-slate-500">Nothing found</li>}
      </ul>
    </div>
  );
};

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / stop'],
  ['Home / End', 'Jump to the start / end'],
  ['Hold B', 'Hear it without effects (A/B)'],
  ['Ctrl+Z / Ctrl+Y', 'Undo / redo'],
  ['Ctrl+C / X / V', 'Copy, cut, paste'],
  ['Ctrl+D', 'Duplicate'],
  ['Ctrl+A', 'Select the active track'],
  ['Ctrl+L', 'Loop the selection'],
  ['Delete', 'Delete the selection, or the picked clips'],
  ['Esc', 'Clear the selection'],
  ['M', 'Add a marker'],
  [', / .', 'Previous / next marker'],
  ['Ctrl+K', 'Command palette'],
  ['?', 'This list'],
  ['Ctrl+click', 'Pick several clips'],
  ['Ctrl+drag', 'Draw a box to pick clips'],
  ['Ctrl when dropping', 'Copy instead of move'],
  ['Alt while dragging', 'No snapping, no phase nudge'],
  ['Right-click a clip', 'Clip menu'],
  ['Ctrl+wheel', 'Zoom'],
  ['Shift+wheel', 'Scroll sideways'],
];

/** "lowCut" → "low cut" */
const words = (key: string) => key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`);
/** What changed from one undo step to the next, when no button named it */
const describeStep = (a: Project | null, b: Project | null) => {
  if (!b) return 'Empty';
  if (!a) return 'Opened';
  if (b.label) return b.label;
  if (b.tracks.length > a.tracks.length) return 'Add track';
  if (b.tracks.length < a.tracks.length) return 'Remove track';
  if (b.markers !== a.markers) return 'Markers';
  for (const [i, t] of b.tracks.entries()) {
    const o = a.tracks.find((x) => x.id === t.id);
    const name = t.name ?? `Track ${i + 1}`;
    if (!o) return 'Edit';
    if (t.clips !== o.clips) return `Edit ${name}`;
    if (t.name !== o.name) return `Rename to ${name}`;
    if (t.fx !== o.fx) {
      const key = (Object.keys(t.fx ?? NO_FX) as (keyof TrackFx)[]).find((k) => t.fx?.[k] !== o.fx?.[k]);
      return `${name}: ${key ? words(key) : 'effects'}`;
    }
  }
  return 'Edit';
};

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <AudioWaveform className="h-5 w-5" aria-hidden="true" />
      </span>
      Editing Audio
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Scissors className="h-5 w-5" aria-hidden="true" />
          Select, Cut and Move
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem(
            'Select:',
            'drag across a track, then drag the handles to adjust. Shift+click extends, double-click selects a whole clip.'
          )}
          {guideItem(
            'Move:',
            'drag a clip by its header strip, or drag a selection, to slide it in time or onto another track. Hold Ctrl while dragging to drop a copy instead.'
          )}
          {guideItem(
            'Several clips:',
            'Ctrl+drag a box around clips, or Ctrl+click their headers, then drag any of them to move them together.'
          )}
          {guideItem(
            'Trim and extend:',
            'drag the left or right edge of a clip. Trimmed audio is kept, so you can drag it back out.'
          )}
          {guideItem(
            'Clip gain:',
            'drag the dB handle at the top of a clip up or down; double-click it for 0 dB.'
          )}
          {guideItem(
            'Snapping:',
            'edges and the cursor snap to the ruler grid, clip edges, markers and the loop. Hold Alt to drag freely, or switch it off with the magnet.'
          )}
          {guideItem(
            'Markers:',
            'press M to drop one at the cursor, drag it on the ruler, double-click it to remove it.'
          )}
          {guideItem(
            'Copy and paste:',
            'copy, cut, paste at the cursor and duplicate selections or clips. Click a clip header to select the whole clip.'
          )}
          {guideItem(
            'Trim / Delete:',
            'keep only the selected time, or cut the selection out of its track.'
          )}
          {guideItem('From video:', 'drop a video to edit or extract its soundtrack.')}
          {guideItem(
            'Drop files:',
            'drag sounds from your desktop onto any track, or below the last track for a new one. They land where you drop them.'
          )}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Layers className="h-5 w-5" aria-hidden="true" />
          Tracks and Effects
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem(
            'Tracks:',
            'add lanes to layer sounds and name them, or add the five weapon layers (Transient, Body, Mech, Tail, Sub) with the button next to Add track. Solo or mute them, pan them left or right, and watch their level while playing. Export mixes what you hear.'
          )}
          {guideItem(
            'Effects:',
            'every track has its own live effect chain: volume, pan, pitch, pitch envelope, volume gate, punch, overdrive, lo-fi, filters, EQ, clipper, low pass gate, flanger, delay and reverb, in that order. Changes are heard right away and can be undone. Bake renders them into the audio. Copy a chain to another track, or save it as a preset.'
          )}
          {guideItem(
            'Seamless loops:',
            'Make seamless loop finds the end that matches the start and blends it in. Extend by looping repeats that loop to a set length; Extend as texture rebuilds steady sounds (hum, fans, wind) from random pieces so nothing repeats. Overlap two clips and auto crossfade blends them, lining the dropped one up in phase.'
          )}
          {guideItem(
            'Fades, normalize, reverse:',
            'the toolbar buttons process the selection, or the whole track when nothing is selected.'
          )}
          {guideItem(
            'Equalizer:',
            'drag the Low, Mid and High dots: sideways sets the frequency, up or down boosts or cuts by up to 12 dB. Click anywhere on the graph to pull the nearest dot there, scroll on the Mid dot to make it wider or narrower, double-click a dot to reset it. Arrow keys work too.'
          )}
          {guideItem(
            'Filters:',
            'drag the slider or type the exact frequency in Hz, pick a slope of 12, 24 or 48 dB per octave, and add resonance for a peak at the cutoff. The graph shows the result.'
          )}
          {guideItem(
            'Reverb:',
            'start from a preset, then set the decay, the pre-delay, the room size, the balance of early reflections and tail, damping, diffusion, filters on the reverb alone and its stereo width.'
          )}
          {guideItem(
            'Clip fades:',
            'drag the small squares at the top corners of a clip to fade it in or out, and the dot to bend the curve. Double-click the dot to make it straight again.'
          )}
          {guideItem(
            'Glue compressor:',
            'evens out the mix of all tracks so layered sounds hit as one. It changes playback and export, and you can adjust it any time.'
          )}
          {guideItem(
            'Game SFX:',
            'shape transients, saturate, overdrive, clip, bitcrush, gate, flange and echo, let a hit fall in pitch, add a reverb tail, make seamless loops and generate noise bursts and sub thumps.'
          )}
          {guideItem(
            'Weapons:',
            'add mechanics (bolt, click, magazine, shell), line up every layer to the same attack, export suppressed versions and Field, City, Canyon or Indoor tails, and export an auto-fire loop with its release tail for the game engine.'
          )}
          {guideItem(
            'Compare and find:',
            'hold B to hear it without effects, switch on the spectrogram to see pitch over time, star the effects you use most, right-click a clip for its menu, and press Ctrl+K to find any action by name.'
          )}
          {guideItem(
            'Export:',
            'match loudness in LUFS with a limiter, export up to 10 variations with random pitch and volume as a ZIP, split the export at markers into one file per part, add close, mid and far versions, nudge each layer timing and tone per take, keep true peaks under -1 dBTP, export in mono or at another sample rate, and test it on auto-fire at any fire rate.'
          )}
          {guideItem(
            'Formats:',
            'MP3, WAV, OGG, FLAC and M4A, so this doubles as an audio converter.'
          )}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Shortcuts
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li>
            <kbd className={guideKey}>Space</kbd> play / stop, <kbd className={guideKey}>Home</kbd>{' '}
            / <kbd className={guideKey}>End</kbd> jump
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+C</kbd> / <kbd className={guideKey}>X</kbd> /{' '}
            <kbd className={guideKey}>V</kbd> / <kbd className={guideKey}>D</kbd> copy, cut, paste,
            duplicate
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+L</kbd> loop the selection; drag the loop brace on the
            ruler, double-click the ruler to switch looping
          </li>
          <li>
            <kbd className={guideKey}>M</kbd> add a marker, <kbd className={guideKey}>,</kbd> /{' '}
            <kbd className={guideKey}>.</kbd> previous / next marker
          </li>
          <li>
            <kbd className={guideKey}>Alt</kbd> while dragging: no snapping
          </li>
          <li>
            hold <kbd className={guideKey}>B</kbd> to hear it without effects,{' '}
            <kbd className={guideKey}>Ctrl+K</kbd> command palette, <kbd className={guideKey}>?</kbd> all shortcuts
          </li>
          <li>Focus mode: the mouse wheel drives the timeline and the page stays put</li>
          <li>
            <kbd className={guideKey}>Ctrl</kbd> + mouse wheel zoom, or hold the ruler and drag down or up,{' '}
            <kbd className={guideKey}>Shift</kbd> + wheel scrolls sideways
          </li>
          <li>
            <kbd className={guideKey}>Del</kbd> delete the picked clips or the selection,{' '}
            <kbd className={guideKey}>Esc</kbd> clear it
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+A</kbd> select the whole track
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+Z</kbd> / <kbd className={guideKey}>Ctrl+Y</kbd> undo /
            redo
          </li>
        </ul>
      </section>
    </div>
  </div>
);

const AudioEditor = () => {
  const [historyLimit, setHistoryLimit] = useState(30);
  const {
    present: project,
    past,
    future,
    commit: commitRaw,
    undo,
    redo,
    jump,
    canUndo,
    canRedo,
  } = useHistory<Project | null>(() => null, historyLimit);
  // Filled again by the buttons below on every render
  commands.clear();
  /** Every undo step carries the name of the button that made it, or none */
  const commit = (next: Project | null, coalesce = false) => {
    if (!next || next === project) return commitRaw(next, coalesce);
    const rest = omit(next, 'label');
    commitRaw(actionLabel ? { ...rest, label: actionLabel } : rest, coalesce);
  };
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection>({ track: 0, start: 0, end: 0 });
  const [muted, setMuted] = useState<number[]>([]);
  const [soloed, setSoloed] = useState<number[]>([]);
  /** Clips picked by Ctrl+click or a Ctrl+drag box; they move and delete together */
  const [picked, setPicked] = useState<Clip[]>([]);
  /** Ctrl+drag box: seconds across, pixels down from the first lane's top */
  const [marquee, setMarquee] = useState<{ t0: number; t1: number; y0: number; y1: number } | null>(
    null
  );
  /** A clip being trimmed or gained, shown before it's committed */
  const [clipDraft, setClipDraft] = useState<{ track: number; index: number; clip: Clip } | null>(
    null
  );
  const [markerDraft, setMarkerDraft] = useState<{ index: number; t: number } | null>(null);
  /** Where the current drag snapped, seconds */
  const [snapAt, setSnapAt] = useState<number | null>(null);
  const [snap, toggleSnap] = useStoredToggle('audio-editor:snap');
  const [autoXfade, toggleAutoXfade] = useStoredToggle('audio-editor:auto-crossfade');
  /** Where dragged selections or clips would land, and how long they are (seconds) */
  const [move, setMove] = useState<{ track: number; at: number; len: number }[] | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  /** Arrangement loop brace, seconds */
  const [loopRegion, setLoopRegion] = useState<{ start: number; end: number } | null>(null);
  const [follow, toggleFollow] = useStoredToggle('audio-editor:follow');
  const [focusMode, toggleFocus] = useStoredToggle('audio-editor:focus', false);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fadeDraft, setFadeDraft] = useState<{
    track: number;
    clip: number;
    edge: FadeEdge;
    fade: Fade;
  } | null>(null);
  const [glueOn, setGlueOn] = useState(false);
  const [glueSet, setGlueSet] = useState(GLUE_DEFAULT);
  const [fx, setFxState] = useState(FX_DEFAULT);
  const [matchLoudness, setMatchLoudness] = useState(false);
  const [targetLufs, setTargetLufs] = useState(-14);
  const [takes, setTakes] = useState(1);
  const [varyPitch, setVaryPitch] = useState(2);
  const [varyVolume, setVaryVolume] = useState(3);
  /** Where dragged-in files would land; track null = a new track */
  const [dropAt, setDropAt] = useState<{ track: number | null; at: number } | null>(null);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [kbps, setKbps] = useState(192);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [splitMarkers, setSplitMarkers] = useState(false);
  const [exportMono, setExportMono] = useState(false);
  /** Hz; 0 = the project's rate */
  const [exportRate, setExportRate] = useState(0);
  const [distances, setDistances] = useState(false);
  /** Where the export is fired; all = one file per place */
  const [place, setPlace] = useState<Environment | 'all' | ''>('');
  const [suppressedToo, setSuppressedToo] = useState(false);
  /** ms each layer of a variation may start late */
  const [jitterMs, setJitterMs] = useState(0);
  /** ± dB of random tone tilt per variation */
  const [varyTone, setVaryTone] = useState(0);
  const [fxClipboard, setFxClipboard] = useState<TrackFx | null>(null);
  /** Saved effect chains, remembered per browser */
  const [presets, setPresets] = useState<FxPresets>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '{}');
      return saved && typeof saved === 'object' ? (saved as FxPresets) : {};
    } catch {
      return {};
    }
  });
  const [presetName, setPresetName] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 360 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  /** A/B: every track as recorded, no effects, no glue; while B is held or the switch is on */
  const [bypass, setBypass] = useState(false);
  const [spectrum, toggleSpectrum] = useStoredToggle('audio-editor:spectrum', false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  /** Right-clicked clip, and where the menu opens */
  const [clipMenu, setClipMenu] = useState<{ x: number; y: number; track: number; index: number } | null>(
    null
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
      return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const fav = (title: string) => ({
    on: favorites.includes(title),
    toggle: () => {
      const next = favorites.includes(title) ? favorites.filter((f) => f !== title) : [...favorites, title];
      setFavorites(next);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the stars last for this visit
      }
    },
  });

  const workspaceRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const insertInputRef = useRef<HTMLInputElement>(null);
  const insertModeRef = useRef<'cursor' | 'end' | 'track'>('cursor');
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const sampleRate = project?.sampleRate ?? 1;
  const tracks = project?.tracks ?? NO_TRACKS;
  const markers = project?.markers ?? NO_MARKERS;
  const active = tracks.find((t) => t.id === selection.track) ?? tracks[0];
  const hasSelection = selection.end - selection.start > 0.001;
  const toSample = (t: number) => Math.round(t * sampleRate);
  // Effects work on the selection, or on the whole active track when nothing is selected
  const range = (): [number, number] =>
    hasSelection
      ? [toSample(selection.start), toSample(selection.end)]
      : active
        ? [trackStart(active), trackEnd(active)]
        : [0, 0];
  const [showLeft, toggleLeft] = useStoredToggle('audio-editor:project-panel');
  const [showRight, toggleRight] = useStoredToggle('audio-editor:sound-panel');
  const [sideTab, setSideTab] = useState<'project' | 'sound'>('sound');
  const headerRef = useRef<HTMLDivElement>(null);

  const fxOf = (t: Track | undefined) => t?.fx ?? NO_FX;
  const activeFx = fxOf(active);
  /** Effect changes are undo steps; a run of quick tweaks is one */
  const setTrackFx = (id: number, patch: Partial<TrackFx>) => {
    if (!project) return;
    commit(
      {
        ...project,
        tracks: project.tracks.map((t) =>
          t.id === id ? { ...t, fx: { ...fxOf(t), ...patch } } : t
        ),
      },
      true
    );
  };
  const setActiveFx = (patch: Partial<TrackFx>) => active && setTrackFx(active.id, patch);
  /** Patches one of the effects that keep their settings in an object */
  const setFxPart = <
    K extends 'pitchEnv' | 'gate' | 'overdrive' | 'clipper' | 'lpg' | 'flanger' | 'delay' | 'reverb',
  >(
    key: K,
    patch: Partial<TrackFx[K]>
  ) => setActiveFx({ [key]: { ...activeFx[key], ...patch } });
  /** Puts a whole chain on the active track. Volume and pan belong to the mix, so they stay */
  const loadFx = (chain: Partial<TrackFx>) =>
    setActiveFx({ ...withFxDefaults(chain), volume: activeFx.volume, pan: activeFx.pan });
  const storePresets = (next: FxPresets) => {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      // storage blocked: the presets last for this visit
    }
  };
  const renameTrack = (name: string) =>
    project &&
    active &&
    commit(
      {
        ...project,
        tracks: project.tracks.map((t) => (t.id === active.id ? { ...t, name } : t)),
      },
      true
    );
  /** Effect slider in one line */
  const slide = (
    label: string,
    value: number,
    valueText: string,
    onChange: (v: number) => void,
    [min, max, step]: [number, number, number],
    hint?: string
  ) => (
    <SettingSlider
      label={label}
      value={value}
      valueText={valueText}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      hint={hint}
      disabled={busy}
    />
  );
  /** Slider for a 0..1 setting, shown in percent; `zero` names what 0 % means */
  const percent = (label: string, value: number, onChange: (v: number) => void, hint?: string, zero?: string) =>
    slide(
      label,
      Math.round(value * 100),
      zero && !value ? zero : `${Math.round(value * 100)} %`,
      (v) => onChange(v / 100),
      [0, 100, 1],
      hint
    );
  const slopePicker = (label: string, value: Slope, onChange: (s: Slope) => void) => (
    <div className="flex items-center justify-between gap-2">
      <span className={sectionLabel}>Slope, dB/oct</span>
      <div role="group" aria-label={`${label}, dB per octave`} className={segmentGroup}>
        {SLOPES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            onClick={() => onChange(s)}
            className={segmentButton}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
  const audible = (id: number) => !muted.includes(id) && (!soloed.length || soloed.includes(id));

  // Effect tweaks reach the mix once they pause, not on every slider step; clip edits reach it at once
  const [liveTracks, setLiveTracks] = useState(tracks);
  useEffect(() => {
    const sameClips =
      tracks.length === liveTracks.length &&
      tracks.every((t, i) => t.id === liveTracks[i].id && t.clips === liveTracks[i].clips);
    if (!sameClips) return setLiveTracks(tracks);
    const id = setTimeout(() => setLiveTracks(tracks), 120);
    return () => clearTimeout(id);
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each track through its effect chain, cached so tweaking one track doesn't reprocess the others
  const processedRef = useRef(new Map<number, { clips: Clip[]; fx: TrackFx; pcm: Pcm }>());
  const rate = project?.sampleRate;
  // What plays and exports: every audible track through its effects, summed, through the glue compressor when it's on
  const { mix, reduction } = useMemo(() => {
    if (!rate) return { mix: null, reduction: 0 };
    const cache = processedRef.current;
    for (const id of cache.keys()) if (!liveTracks.some((t) => t.id === id)) cache.delete(id);
    const outs = liveTracks
      .filter(
        (t) => !muted.includes(t.id) && (!soloed.length || soloed.includes(t.id)) && t.clips.length
      )
      .map((t) => {
        const fx = t.fx ?? NO_FX;
        const hit = cache.get(t.id);
        if (hit?.clips === t.clips && hit.fx === fx) return hit.pcm;
        const pcm = processTrack(renderClips(t.clips, rate, 0, trackEnd(t)), fx);
        cache.set(t.id, { clips: t.clips, fx, pcm });
        return pcm;
      });
    const sum = renderClips(
      outs.map((pcm) => ({ at: 0, pcm })),
      rate,
      0,
      Math.max(tracksLength(liveTracks), ...outs.map(pcmLength))
    );
    if (!glueOn) return { mix: sum, reduction: 0 };
    const glued = glue(sum, glueSet);
    return { mix: glued.pcm, reduction: glued.reduction };
  }, [rate, liveTracks, muted, soloed, glueOn, glueSet]);
  // A/B: the same tracks with nothing on them
  const dry = useMemo(
    () =>
      bypass && rate
        ? renderClips(
            liveTracks.filter((t) => audible(t.id)).flatMap((t) => t.clips),
            rate,
            0,
            tracksLength(liveTracks)
          )
        : null,
    [bypass, rate, liveTracks, muted, soloed] // eslint-disable-line react-hooks/exhaustive-deps
  );
  /** What plays */
  const heard = dry ?? mix;
  /** Peak of a track's processed audio over the last 50 ms before the playhead, while playing */
  const levelOf = (t: Track) => {
    const pcm =
      playing && audible(t.id) && t.clips.length ? processedRef.current.get(t.id)?.pcm : undefined;
    if (!pcm) return 0;
    const end = Math.floor(playhead * sampleRate);
    let peak = 0;
    for (const ch of pcm.channels)
      for (
        let i = Math.max(0, end - Math.round(sampleRate / 20));
        i < Math.min(ch.length, end);
        i++
      )
        peak = Math.max(peak, Math.abs(ch[i]));
    return peak;
  };
  /** Includes reverb tails that ring past the last clip */
  const duration = Math.max(tracksLength(tracks), mix ? pcmLength(mix) : 0) / sampleRate;
  /** Seconds the timeline shows: a bit past the end so parts can be dragged there */
  const span = Math.max(1, duration * 1.1);

  // ---- loading ----
  const load = useCallback(
    async (next: File) => {
      setBusy(true);
      try {
        const decoded = await decode(next);
        if (pcmBytes(decoded) > MEMORY_BUDGET / 2)
          throw new Error('This file is too long to edit in the browser');
        setHistoryLimit(historyLimitFor(pcmBytes(decoded)));
        stop();
        const track = newTrack([{ at: 0, pcm: decoded }]);
        commitRaw({ sampleRate: decoded.sampleRate, tracks: [track] });
        setFile(next);
        setMuted([]);
        setSoloed([]);
        setPicked([]);
        setSelection({ track: track.id, start: 0, end: 0 });
        setPlayhead(0);
        setZoom(1);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [commitRaw]
  );

  useHandoff((f) => void load(f));

  const clear = () => {
    stop();
    commit(null);
    setFile(null);
  };

  // ---- playback ----
  const stop = () => {
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* not started */
      }
    }
    setPlaying(false);
  };

  /** Replaces whatever plays with a source for this audio, not started yet */
  const sourceFor = (pcm: Pcm) => {
    stop();
    const ctx = getContext();
    void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = toBuffer(ctx, pcm);
    src.connect(ctx.destination);
    src.onended = () => {
      if (sourceRef.current === src) {
        sourceRef.current = null;
        setPlaying(false);
      }
    };
    sourceRef.current = src;
    setPlaying(true);
    return src;
  };

  const play = (from?: number) => {
    if (!heard) return;
    const src = sourceFor(heard);
    const ctx = getContext();

    const start =
      from ??
      (hasSelection && (playhead < selection.start || playhead >= selection.end)
        ? selection.start
        : playhead >= duration
          ? 0
          : playhead);
    // The loop brace catches playback that starts before its end, like in a DAW
    const lr =
      loop && loopRegion && loopRegion.end - loopRegion.start > 0.01 && start < loopRegion.end
        ? loopRegion
        : null;
    if (lr) {
      src.loop = true;
      src.loopStart = lr.start;
      src.loopEnd = lr.end;
    }
    // Without loop a selection plays to its end; a cursor plays to the end of the project
    const until = hasSelection && start < selection.end ? selection.end : duration;
    src.start(0, start, lr ? undefined : Math.max(0, until - start));

    const t0 = ctx.currentTime;
    const tick = () => {
      if (sourceRef.current !== src) return;
      let t = start + (ctx.currentTime - t0);
      if (lr && t >= lr.end) t = lr.start + ((t - lr.start) % (lr.end - lr.start));
      setPlayhead(Math.min(t, duration));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const togglePlay = () => (playing ? stop() : play());

  const seek = (t: number) => {
    setPlayhead(t);
    if (playing && t < duration) play(t);
    else stop();
  };

  useEffect(() => () => stop(), []);
  // Muting, effects or the loop change what plays: keep playing from the same spot with the new one
  useEffect(() => {
    if (sourceRef.current && dragRef.current?.mode !== 'loop') play(playhead);
  }, [heard, loop, loopRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Loop on/off; switching it on without a brace sets one over the selection, or everything */
  const toggleLoop = () => {
    if (!loop && !loopRegion)
      setLoopRegion(
        hasSelection ? { start: selection.start, end: selection.end } : { start: 0, end: duration }
      );
    setLoop((l) => !l);
  };
  const loopSelection = () => {
    if (!requireSelection()) return;
    setLoopRegion({ start: selection.start, end: selection.end });
    setLoop(true);
  };

  // ---- edits ----
  /** Overlapping clips get crossfades when auto crossfade is on; unchanged tracks keep their identity */
  const crossfaded = (next: Track[]) =>
    autoXfade
      ? next.map((t) => {
          const clips = autoCrossfade(t.clips);
          return clips === t.clips ? t : { ...t, clips };
        })
      : next;
  const apply = (next: Track[], nextSelection: Selection = selection) => {
    if (!project) return;
    stop();
    commit({ ...project, tracks: crossfaded(next) });
    setSelection(nextSelection);
    setPlayhead((p) => Math.min(p, tracksLength(next) / project.sampleRate));
  };

  const mapActive = (fn: (t: Track) => Track) => tracks.map((t) => (t === active ? fn(t) : t));

  const requireSelection = () => {
    if (!hasSelection) toast.info('Select a part of a track first');
    return hasSelection;
  };

  /** Keeps only samples [s, e) on every track */
  const crop = (s: number, e: number) => {
    apply(
      tracks.map((t) => ({
        ...t,
        clips: cutClips(cutClips(t.clips, e, Infinity), -Infinity, s).map((c) => ({
          ...c,
          at: c.at - s,
        })),
      })),
      { ...selection, start: 0, end: 0 }
    );
    setPlayhead(0);
  };

  const trimToSelection = () => {
    if (requireSelection()) crop(...range());
  };

  /** Cuts the silent time before the first and after the last audible sound of the mix */
  const trimSilence = () => {
    if (!mix) return;
    const [s, e] = audibleRange(mix);
    if (e <= s) toast.info('Everything is silent');
    else if (s === 0 && e === pcmLength(mix)) toast.info('No silence at the start or end');
    else {
      crop(s, e);
      toast.success(
        `Trimmed ${formatTimecode((pcmLength(mix) - (e - s)) / sampleRate)} of silence`
      );
    }
  };

  /** The range, minus silence past either end of the active track: loops and extensions never take empty time along */
  const audioRange = (): [number, number] => {
    const [s, e] = range();
    if (!active?.clips.length) return [s, s];
    const a = Math.max(s, trackStart(active));
    return [a, Math.max(a, Math.min(e, trackEnd(active)))];
  };
  const seamNote = (match: number) =>
    `Seam match ${Math.round(Math.max(0, match) * 100)}%${match < 0.6 ? ': try a longer crossfade, or Texture' : ''}`;

  /**
   * Finds where the range loops best (its end moved back to match the start in phase and level),
   * crossfades that end into the start, closes the gap and loops playback over it
   */
  const makeSeamless = () => {
    if (!active) return;
    const [s, e0] = audioRange();
    const want = toSample(fx.loopMs / 1000);
    const found = findLoopEnd(renderClips(active.clips, sampleRate, s, e0), want);
    const e = s + found.end;
    const xf = Math.min(want, Math.floor((e - s) / 2));
    if (xf < 1) return;
    toast.success(seamNote(found.match));
    apply(
      mapActive((t) => {
        const looped = editTrackRange(t, sampleRate, s, e, (p) => makeLoop(p, xf));
        return looped === t ? t : deleteTrackRange(looped, e - xf, e);
      }),
      { track: active.id, start: s / sampleRate, end: (e - xf) / sampleRate }
    );
    setLoopRegion({ start: s / sampleRate, end: (e - xf) / sampleRate });
    setLoop(true);
  };

  /** Replaces the range with a longer version of itself: whole loop cycles, or a texture rebuilt from grains */
  const extendRange = (how: 'loop' | 'texture') => {
    if (!active) return;
    const [s, e] = audioRange();
    const target = toSample(fx.extendLen);
    if (e - s >= target) {
      toast.info(`Already ${fx.extendLen} s or longer: pick a longer length`);
      return;
    }
    const src = renderClips(active.clips, sampleRate, s, e);
    const { pcm, match } =
      how === 'loop'
        ? extendLoop(src, toSample(fx.loopMs / 1000), target)
        : texture(src, target, toSample(fx.grainMs / 1000));
    if (pcm === src) {
      toast.info('Too short to extend');
      return;
    }
    apply(
      mapActive((t) => insertIntoTrack(deleteTrackRange(t, s, e), s, pcm)),
      { track: active.id, start: s / sampleRate, end: (s + pcmLength(pcm)) / sampleRate }
    );
    toast.success(`Extended to ${pcmDuration(pcm).toFixed(1)} s. ${seamNote(match)}`);
  };

  /** A generated sound on a new track at the cursor, with a fast curved fade-out */
  /** A named sound is already shaped, so it gets no fade-out */
  const addGenerated = (pcm: Pcm, name?: string) => {
    const n = pcmLength(pcm);
    const clip: Clip = {
      at: toSample(playhead),
      pcm,
      fadeIn: { length: Math.min(n, toSample(0.002)), curve: 0 },
      ...(name ? {} : { fadeOut: { length: Math.round(n * 0.9), curve: -0.6 } }),
    };
    const track = { ...newTrack([clip]), ...(name ? { name } : {}) };
    apply([...tracks, track], { track: track.id, start: playhead, end: playhead + n / sampleRate });
  };
  /** The base of whooshes, hits and explosions */
  const addNoise = () => addGenerated(noise(sampleRate, fx.genLen, fx.noiseColor));
  /** The low punch under a shot or an explosion */
  const addThump = () => addGenerated(sweep(sampleRate, fx.genLen, fx.thumpFrom, fx.thumpTo));
  /** Named Mech, so the suppressed export leaves it as it is */
  const addMech = () => addGenerated(mechSound(sampleRate, fx.mechKind), `Mech ${MECH_LABELS[fx.mechKind].toLowerCase()}`);

  /**
   * Moves every other track so its attack lines up with the active track's: layers that hit together sound like one
   * shot, not a flam. If that would push a track before 0, everything moves later instead.
   */
  const alignAttacks = () => {
    if (!active?.clips.length) return;
    const onset = (t: Track) => trackStart(t) + onsetOf(renderClips(t.clips, sampleRate, trackStart(t), trackEnd(t)));
    const target = onset(active);
    const shifts = tracks.map((t) => (t === active || !t.clips.length ? 0 : target - onset(t)));
    if (shifts.every((d) => !d)) {
      toast.info('Already lined up');
      return;
    }
    const lead = Math.max(0, ...tracks.map((t, i) => (t.clips.length ? -(trackStart(t) + shifts[i]) : 0)));
    apply(
      tracks.map((t, i) =>
        shifts[i] + lead ? { ...t, clips: t.clips.map((c) => ({ ...c, at: c.at + shifts[i] + lead })) } : t
      )
    );
    toast.success(`Lined up ${shifts.filter(Boolean).length} tracks on ${active.name ?? 'the active track'}`);
  };

  const deleteSelection = () => {
    if (!requireSelection()) return;
    apply(
      mapActive((t) => deleteTrackRange(t, ...range())),
      { ...selection, end: selection.start }
    );
    setPlayhead(selection.start);
  };

  const effect = (fn: (p: Pcm, s: number, e: number) => Pcm) => {
    if (!active) return;
    const [s, e] = range();
    apply(mapActive((t) => editTrackRange(t, sampleRate, s, e, (p) => fn(p, 0, pcmLength(p)))));
  };

  const moveSelection = (to: number, at: number, copy: boolean) => {
    const len = selection.end - selection.start;
    apply(
      moveRange(
        tracks,
        selection.track,
        toSample(selection.start),
        toSample(selection.end),
        to,
        toSample(at),
        copy
      ),
      {
        track: to,
        start: at,
        end: at + len,
      }
    );
  };

  /**
   * Moves (or copies) whole clips, fades and all, `lanes` tracks down and `shift` samples later; they stay picked.
   * With auto crossfade one clip dropped over another is nudged into phase with it, unless placed freely (Alt).
   */
  const moveGroup = (clips: Clip[], lanes: number, shift: number, copy: boolean, free = false) => {
    const result = moveClips(tracks, clips, lanes, shift, copy);
    let raw = result.tracks;
    if (autoXfade && !free && result.moved.length === 1) {
      const m = result.moved[0];
      const lane = raw.findIndex((t) => t.clips.includes(m));
      const nudge = alignOverlap(raw[lane].clips, raw[lane].clips.indexOf(m), toSample(ALIGN_MAX));
      if (nudge) {
        const aligned = { ...m, at: m.at + nudge };
        raw = raw.map((t, i) =>
          i === lane ? { ...t, clips: t.clips.map((c) => (c === m ? aligned : c)) } : t
        );
        result.moved[0] = aligned;
      }
    }
    // Crossfading replaces faded clips, so follow the moved ones to their new objects
    const next = crossfaded(raw);
    const moved = result.moved.map((m) => {
      const lane = raw.findIndex((t) => t.clips.includes(m));
      return next[lane].clips[raw[lane].clips.indexOf(m)];
    });
    const one = moved.length === 1 ? moved[0] : null;
    const owner = one && next.find((t) => t.clips.includes(one));
    apply(
      next,
      one && owner
        ? { track: owner.id, start: one.at / sampleRate, end: clipEnd(one) / sampleRate }
        : { ...selection, end: selection.start }
    );
    setPicked(moved);
  };
  const deletePicked = () => {
    const pick = new Set(picked);
    if (!tracks.some((t) => t.clips.some((c) => pick.has(c)))) return false;
    apply(
      tracks.map((t) =>
        t.clips.some((c) => pick.has(c)) ? { ...t, clips: t.clips.filter((c) => !pick.has(c)) } : t
      )
    );
    setPicked([]);
    return true;
  };
  /** Replaces one clip, e.g. after trimming it or changing its gain */
  const setClip = (track: number, index: number, clip: Clip) =>
    apply(
      tracks.map((t) =>
        t.id === track ? { ...t, clips: t.clips.map((c, i) => (i === index ? clip : c)) } : t
      )
    );

  /** A clip's audio changed in place: it no longer windows a longer source */
  const withPcm = (clip: Clip, pcm: Pcm): Clip => ({ ...omit(clip, 'src', 'offset'), pcm });
  const clipActions = (trackId: number, index: number): [string, () => void][] => {
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips[index];
    if (!track || !clip) return [];
    const n = pcmLength(clip.pcm);
    const unfaded = omit(clip, 'fadeIn', 'fadeOut');
    const ungained = omit(clip, 'gain');
    return [
      [
        'Select',
        () => setSelection({ track: trackId, start: clip.at / sampleRate, end: clipEnd(clip) / sampleRate }),
      ],
      ['Duplicate after it', () => moveGroup([clip], 0, n, true, true)],
      ['Normalize', () => setClip(trackId, index, withPcm(ungained, normalize(clip.pcm, 0, n)))],
      [
        'Reverse',
        () => {
          const { fadeIn, fadeOut, ...rest } = withPcm(clip, reverse(clip.pcm, 0, n));
          setClip(trackId, index, { ...rest, ...(fadeOut ? { fadeIn: fadeOut } : {}), ...(fadeIn ? { fadeOut: fadeIn } : {}) });
        },
      ],
      ...(clip.gain ? [['Reset clip gain', () => setClip(trackId, index, ungained)] as [string, () => void]] : []),
      ...(clip.fadeIn || clip.fadeOut
        ? [['Remove fades', () => setClip(trackId, index, unfaded)] as [string, () => void]]
        : []),
      [
        'Delete',
        () => {
          apply(tracks.map((t) => (t === track ? { ...t, clips: t.clips.filter((c) => c !== clip) } : t)));
          setPicked((p) => p.filter((c) => c !== clip));
        },
      ],
    ];
  };

  /** Renders the active track's effects into its audio, as one clip, and switches them off */
  const bakeFx = () => {
    if (!active?.clips.length || !fxActive(activeFx)) return;
    const hit = processedRef.current.get(active.id);
    const full =
      hit?.clips === active.clips && hit.fx === activeFx
        ? hit.pcm
        : processTrack(renderClips(active.clips, sampleRate, 0, trackEnd(active)), activeFx);
    const s = trackStart(active);
    apply(
      mapActive((t) => ({
        ...t,
        fx: NO_FX,
        clips: [{ at: s, pcm: keepRange(full, s, pcmLength(full)) }],
      }))
    );
  };

  // ---- markers ----
  const setMarkers = (next: number[]) =>
    project && commit({ ...project, markers: [...next].sort((a, b) => a - b) });
  const addMarker = () => {
    if (!markers.some((m) => Math.abs(m - playhead) < 1e-3)) setMarkers([...markers, playhead]);
  };
  /** Previous or next marker; while playing the one just passed doesn't count */
  const jumpMarker = (dir: 1 | -1) => {
    const eps = playing ? 0.3 : 1e-3;
    const target =
      dir > 0
        ? markers.find((m) => m > playhead + eps)
        : [...markers].reverse().find((m) => m < playhead - eps);
    if (target !== undefined) seek(target);
  };

  // ---- clipboard ----
  const copySelection = () => {
    if (!active || !requireSelection()) return null;
    const [s, e] = range();
    const copied = { clips: copyRange(active.clips, s, e), length: e - s };
    setClipboard(copied);
    return copied;
  };
  const copy = () => copySelection() && toast.success('Copied');
  /** Copies the selection and lifts it out, leaving silence */
  const cut = () => {
    if (!copySelection()) return;
    const [s, e] = range();
    apply(
      mapActive((t) => ({ ...t, clips: cutClips(t.clips, s, e) })),
      { ...selection, end: selection.start }
    );
  };
  /** Pastes at the cursor of the active track, over what is there */
  const paste = (data = clipboard, at = selection.start) => {
    if (!active || !data) return;
    apply(
      mapActive((t) => pasteClips(t, data.clips, data.length, toSample(at))),
      { track: active.id, start: at, end: at + data.length / sampleRate }
    );
  };
  /** Copies the selection right behind itself, without touching the clipboard */
  const duplicate = () => {
    if (!active || !requireSelection()) return;
    const [s, e] = range();
    paste({ clips: copyRange(active.clips, s, e), length: e - s }, e / sampleRate);
  };

  const addTrack = () => {
    const track = newTrack();
    apply([...tracks, track], { track: track.id, start: playhead, end: playhead });
  };
  /** Empty, named tracks for the layers of a weapon sound */
  const addLayers = () => {
    const layers = WEAPON_LAYERS.map(([name, patch]) => ({
      ...newTrack(),
      name,
      fx: { ...NO_FX, ...patch },
    }));
    apply([...tracks, ...layers], { track: layers[0].id, start: playhead, end: playhead });
  };

  const removeTrack = (id: number) => {
    const rest = tracks.filter((t) => t.id !== id);
    apply(rest, { track: rest[0].id, start: playhead, end: playhead });
    setSoloed((s) => s.filter((x) => x !== id));
  };

  const toggleMute = (id: number) =>
    setMuted((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const toggleSolo = (id: number) =>
    setSoloed((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const insertSilence = () => {
    if (!active) return;
    const at = selection.start;
    apply(
      mapActive((t) =>
        insertIntoTrack(t, toSample(at), { sampleRate, channels: [new Float32Array(sampleRate)] })
      ),
      {
        track: active.id,
        start: at,
        end: at + 1,
      }
    );
  };

  const insertFile = async (other: File) => {
    if (!project || !active) return;
    setBusy(true);
    try {
      const decoded = await decode(other);
      if (decoded.sampleRate !== sampleRate) throw new Error('Sample rates differ');
      const mode = insertModeRef.current;
      const at = mode === 'end' ? trackEnd(active) / sampleRate : selection.start;
      const created = mode === 'track' ? newTrack([{ at: toSample(at), pcm: decoded }]) : null;
      const next = created
        ? [...tracks, created]
        : mapActive((t) => insertIntoTrack(t, toSample(at), decoded));
      setHistoryLimit(
        historyLimitFor(next.flatMap((t) => t.clips).reduce((n, c) => n + pcmBytes(c.pcm), 0))
      );
      apply(next, { track: created?.id ?? active.id, start: at, end: at + pcmDuration(decoded) });
      toast.success(
        `${other.name} ${created ? 'added on a new track' : mode === 'end' ? 'appended' : 'inserted'}`
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Adds dropped files one after another at `at` seconds, on a track or (track null) on a new one. Nothing moves. */
  const dropFiles = async (files: File[], target: { track: number | null; at: number }) => {
    if (!project) return;
    setBusy(true);
    try {
      const clips: Clip[] = [];
      const skipped: string[] = [];
      let at = toSample(target.at);
      for (const f of files) {
        const pcm = await decode(f).catch(() => null);
        if (!pcm || pcm.sampleRate !== sampleRate) {
          skipped.push(f.name);
          continue;
        }
        clips.push({ at, pcm });
        at += pcmLength(pcm);
      }
      if (skipped.length) toast.error(`Could not add ${skipped.join(', ')}`);
      if (!clips.length) return;
      const created = target.track === null ? newTrack(clips) : null;
      const next = created
        ? [...tracks, created]
        : tracks.map((t) => (t.id === target.track ? { ...t, clips: [...t.clips, ...clips] } : t));
      setHistoryLimit(
        historyLimitFor(next.flatMap((t) => t.clips).reduce((n, c) => n + pcmBytes(c.pcm), 0))
      );
      const id = created?.id ?? (target.track as number);
      apply(next, { track: id, start: target.at, end: at / sampleRate });
      const what =
        clips.length === 1
          ? files.find((f) => !skipped.includes(f.name))?.name
          : `${clips.length} files`;
      toast.success(
        `${what} added ${created ? 'on a new track' : `to track ${tracks.findIndex((t) => t.id === id) + 1}`}`
      );
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (mode: typeof insertModeRef.current) => {
    insertModeRef.current = mode;
    insertInputRef.current?.click();
  };

  // ---- export ----
  /** The mix or the selected time, in mono when asked. Null when that is nothing. */
  const exportPick = (base = mix) => {
    if (!base) return null;
    const picked =
      selectionOnly && hasSelection
        ? keepRange(base, toSample(selection.start), toSample(selection.end))
        : base;
    if (!pcmLength(picked)) return null;
    return exportMono ? toMono(picked) : picked;
  };
  /**
   * The tracks summed again, for what the live mix can't give: the suppressed version (every layer but Mech through a
   * suppressor) or a variation whose layers each start up to `jitter` samples late
   */
  const remix = (suppressed: boolean, jitter: number) => {
    if (!rate || (!suppressed && !jitter)) return mix;
    const outs = liveTracks
      .filter((t) => audible(t.id) && t.clips.length)
      .map((t) => {
        const pcm =
          processedRef.current.get(t.id)?.pcm ??
          processTrack(renderClips(t.clips, rate, 0, trackEnd(t)), t.fx ?? NO_FX);
        return {
          at: Math.round(Math.random() * jitter),
          pcm: suppressed && !/mech/i.test(t.name ?? '') ? suppress(pcm) : pcm,
        };
      });
    const sum = renderClips(outs, rate, 0, Math.max(0, ...outs.map(clipEnd)));
    return glueOn ? glue(sum, glueSet).pcm : sum;
  };
  /**
   * At the target loudness, by the gain that brings `like` there: the parts of one sound keep their balance. Peaks
   * stay under -1 dB, between the samples too (true peak), so no encoder or speaker clips them.
   */
  const levelled = (pcm: Pcm, like = pcm) => {
    const measured = matchLoudness ? loudness(like) : NaN;
    if (!Number.isFinite(measured)) return pcm;
    const out = limit(pcm, -1, targetLufs - measured);
    const over = truePeak(out) / 10 ** (-1 / 20);
    return over > 1 ? gain(out, 0, pcmLength(out), 1 / over) : out;
  };
  /** One per variation, so a sound played often in a game doesn't repeat exactly */
  const randomTakes = (): Take[] =>
    takes > 1
      ? Array.from({ length: takes }, () => ({
          st: Math.round((Math.random() * 2 - 1) * varyPitch * 10) / 10,
          db: -Math.random() * varyVolume,
          tone: Math.round((Math.random() * 2 - 1) * varyTone * 10) / 10,
        }))
      : [{ st: 0, db: 0, tone: 0 }];
  /** Tone tilts around 1 kHz: lows down and highs up by the same dB, or the other way */
  const vary = (pcm: Pcm, { st, db, tone }: Take) => {
    const n = pcmLength(pcm);
    let out = db ? gain(pcm, 0, n, 10 ** (db / 20)) : pcm;
    if (tone) out = equalize(out, 0, n, { low: -tone, mid: 0, high: tone });
    return st ? pitchShift(out, 0, n, st) : out;
  };
  /** The export once per variation, each with its own layer timing: the shots of a burst or a loop */
  const shotsOf = (level: boolean) =>
    randomTakes().flatMap((take) => {
      const pick = exportPick(remix(false, toSample(jitterMs / 1000)));
      return pick ? [vary(level ? levelled(pick) : pick, take)] : [];
    });
  const singlePlace = place === 'all' ? '' : place;

  /** Plays the export as a burst, to hear how it repeats in a game */
  const testFire = () => {
    const shots = shotsOf(true);
    if (!shots.length) {
      toast.info('Nothing to play');
      return;
    }
    const burst = autoFire(shots, fx.fireRate, fx.fireShots);
    // The place answers the whole burst, as it would in a game
    sourceFor(singlePlace ? environment(burst, singlePlace) : burst).start();
  };
  /** The burst as a seamless loop and its release tail, levelled together */
  const loopAndTail = () => {
    const shots = shotsOf(false);
    if (!shots.length) {
      toast.info('Nothing to fire');
      return null;
    }
    const { loop, tail } = fireLoop(shots, fx.fireRate, fx.fireShots);
    return { loop: levelled(loop), tail: levelled(tail, loop) };
  };
  /** The loop three times, then the trigger let go */
  const hearLoop = () => {
    const lt = loopAndTail();
    if (!lt) return;
    const n = pcmLength(lt.loop);
    const clips = [0, 1, 2].map((k) => ({ at: k * n, pcm: lt.loop })).concat({ at: 3 * n, pcm: lt.tail });
    sourceFor(renderClips(clips, lt.loop.sampleRate, 0, 3 * n + pcmLength(lt.tail))).start();
  };

  /** Encodes the sounds and downloads them: one file, or a ZIP named with `zipTag` */
  const save = async (sounds: { pcm: Pcm; suffix: string | undefined }[], zipTag: string) => {
    if (!sounds.length) {
      toast.info('Nothing to export');
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const files = await Promise.all(
        sounds.map(async (f) => ({ ...f, pcm: await resample(f.pcm, exportRate) }))
      );
      let done = 0;
      const blobs =
        format === 'wav'
          ? files.map((f) => encodeWav(f.pcm))
          : await withFFmpeg(
              async (ff) => {
                const out: Blob[] = [];
                for (const [i, { pcm }] of files.entries()) {
                  await ff.write(`in${i}.wav`, encodeWav(pcm));
                  await ff.run(
                    ['-i', `in${i}.wav`, ...audioCodecArgs(format, kbps), `out${i}.${format}`],
                    pcmDuration(pcm)
                  );
                  out.push(await ff.read(`out${i}.${format}`, AUDIO_MIME[format]));
                  done++;
                }
                return out;
              },
              (p) => setProgress((done + p) / files.length)
            );
      let out = toFile(blobs[0], file?.name, format, files[0].suffix);
      if (blobs.length > 1) {
        const zip = new JSZip();
        blobs.forEach((blob, i) =>
          zip.file(toFile(blob, file?.name, format, files[i].suffix).name, blob)
        );
        out = toFile(await zip.generateAsync({ type: 'blob' }), file?.name, 'zip', zipTag);
      }
      downloadBlob(out, out.name, { showToast: true });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const exportLoop = () => {
    const lt = loopAndTail();
    if (lt) void save([{ pcm: lt.loop, suffix: 'loop' }, { pcm: lt.tail, suffix: 'tail' }], 'auto-fire');
  };

  const places: (Environment | '')[] = place === 'all' ? ENVIRONMENT_NAMES : [place];
  const versions = suppressedToo ? [false, true] : [false];
  const exportAudio = () => {
    const first = exportPick();
    if (!first) {
      toast.info('Nothing to export');
      return;
    }
    const offset = selectionOnly && hasSelection ? toSample(selection.start) : 0;
    const cuts = splitMarkers
      ? markers.map((m) => toSample(m) - offset).filter((c) => c > 0 && c < pcmLength(first))
      : [];
    const jitter = toSample(jitterMs / 1000);
    const at = (pcm: Pcm, where: Environment | '') => (where ? environment(pcm, where) : pcm);
    const sounds = randomTakes().flatMap((take, t) =>
      versions.flatMap((suppressed) => {
        const pick = suppressed || jitter ? exportPick(remix(suppressed, jitter)) : first;
        if (!pick) return [];
        const parts = cuts.length ? splitAt(pick, cuts) : [pick];
        return (distances ? DISTANCES : ONE_DISTANCE).flatMap(([where, far]) =>
          places.flatMap((env) => {
            // Loudness is matched on the whole export. Parts are moved away one by one, so no tail rings into the next
            const whole = at(distance(pick, far), env);
            return parts.map((part, i) => ({
              pcm: vary(levelled(cuts.length ? at(distance(part, far), env) : whole, whole), take),
              suffix:
                [
                  cuts.length ? `part${i + 1}` : '',
                  where,
                  env,
                  suppressed ? 'suppressed' : '',
                  takes > 1 ? String(t + 1) : '',
                ]
                  .filter(Boolean)
                  .join('-') || undefined,
            }));
          })
        );
      })
    );
    void save(
      sounds,
      cuts.length
        ? 'parts'
        : distances
          ? 'distances'
          : place === 'all'
            ? 'places'
            : suppressedToo
              ? 'versions'
              : 'variations'
    );
  };

  // ---- timeline ----
  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const measure = () => setViewSize({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [project !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const canvasWidth = Math.min(MAX_CANVAS, Math.max(1, Math.round(viewSize.width * zoom)));
  // Lanes share the view's height until they hit their minimum, then the view scrolls
  const laneHeight = Math.max(
    MIN_LANE_H,
    Math.floor((viewSize.height - RULER_H - ADD_ROW_H) / Math.max(1, tracks.length))
  );

  const tickStep =
    RULER_STEPS.find((s) => (s / span) * canvasWidth >= MIN_TICK_PX) ??
    RULER_STEPS[RULER_STEPS.length - 1];
  const ticks = Array.from(
    { length: Math.floor(span / tickStep + 1e-6) + 1 },
    (_, i) => Math.round(i * tickStep * 10) / 10
  );
  const tickLabel = (t: number) =>
    tickStep >= 1 ? formatTimecode(t).replace(/\.\d$/, '') : formatTimecode(t);
  const shownMarkers = markers.map((m, i) => (markerDraft?.index === i ? markerDraft.t : m));

  // Follow: keep the playhead in view while zoomed in and playing
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !playing || !follow || zoom === 1) return;
    const x = (playhead / span) * canvasWidth;
    if (x < view.scrollLeft || x > view.scrollLeft + view.clientWidth - 20)
      view.scrollLeft = x - 20;
  }, [playhead, playing, follow, zoom, span, canvasWidth]);

  const timeAt = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(span, ((clientX - rect.left) / rect.width) * span));
  };

  const laneIndexAt = (clientY: number) => {
    const top = lanesRef.current?.getBoundingClientRect().top ?? 0;
    return Math.max(0, Math.min(tracks.length - 1, Math.floor((clientY - top) / laneHeight)));
  };
  const laneAt = (clientY: number) => tracks[laneIndexAt(clientY)]?.id ?? 0;

  type Skip = { clips?: Clip[] | undefined; marker?: number; loop?: boolean };
  /** Nearest grid line, playhead, marker, loop edge or clip edge within SNAP_PX of t; null when snapping is off or Alt is held */
  const snapPoint = (t: number, alt: boolean, skip: Skip = {}) => {
    if (!snap || alt) return null;
    const points = [Math.round(t / tickStep) * tickStep, playhead];
    markers.forEach((m, i) => i !== skip.marker && points.push(m));
    if (loopRegion && !skip.loop) points.push(loopRegion.start, loopRegion.end);
    for (const tr of tracks)
      for (const c of tr.clips)
        if (!skip.clips?.includes(c)) points.push(c.at / sampleRate, clipEnd(c) / sampleRate);
    let best: number | null = null;
    for (const p of points)
      if (
        Math.abs(p - t) <= (SNAP_PX / canvasWidth) * span &&
        (best === null || Math.abs(p - t) < Math.abs(best - t))
      )
        best = p;
    return best;
  };
  const snapTo = (t: number, alt: boolean, skip?: Skip) => {
    const p = snapPoint(t, alt, skip);
    setSnapAt(p);
    return Math.max(0, p ?? t);
  };
  /** Start of a block of length len near start, snapped by whichever edge is closer to a snap point */
  const snapBlock = (start: number, len: number, alt: boolean, skip?: Skip) => {
    const a = snapPoint(start, alt, skip);
    const b = snapPoint(start + len, alt, skip);
    const da = a === null ? Infinity : Math.abs(a - start);
    const db = b === null ? Infinity : Math.abs(b - start - len);
    const p = da <= db ? a : b;
    setSnapAt(p);
    return Math.max(0, p === null ? start : da <= db ? p : p - len);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!project || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeAt(e.clientX);
    const lane = laneIndexAt(e.clientY);
    const track = tracks[lane].id;
    const lanesTop = lanesRef.current?.getBoundingClientRect().top ?? 0;
    // A clip's header strip grabs the whole clip
    const index =
      e.clientY - lanesTop - lane * laneHeight < CLIP_HEAD_H ? clipIndexAt(tracks[lane], t) : -1;
    const clip = index >= 0 ? tracks[lane].clips[index] : undefined;
    const ctrl = e.ctrlKey || e.metaKey;
    // Ctrl+drag off a header draws a box
    if (ctrl && !clip) {
      const y = e.clientY - lanesTop;
      dragRef.current = { mode: 'marquee', t0: t, y0: y };
      setMarquee({ t0: t, t1: t, y0: y, y1: y });
      setPicked([]);
      return;
    }
    const grabbing = (items: MoveItem[], clips?: Clip[]) => {
      const start = Math.min(...items.map((i) => i.at));
      const len = Math.max(...items.map((i) => i.at + i.len)) - start;
      dragRef.current = {
        mode: 'move',
        grab: t - start,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        clips,
        toggle: ctrl ? clip : undefined,
        items,
        lane0: lane,
        start,
        len,
        at: start,
        lanes: 0,
      };
    };
    if (!e.shiftKey && clip) {
      const clips = picked.includes(clip) && picked.length > 1 ? picked : [clip];
      grabbing(
        clips.map((c) => ({
          lane: tracks.findIndex((x) => x.clips.includes(c)),
          at: c.at / sampleRate,
          len: pcmLength(c.pcm) / sampleRate,
        })),
        clips
      );
      return;
    }
    // Grabbing inside the selection moves that part
    if (
      !e.shiftKey &&
      hasSelection &&
      track === selection.track &&
      t > selection.start &&
      t < selection.end
    ) {
      grabbing([{ lane, at: selection.start, len: selection.end - selection.start }]);
      return;
    }
    setPicked([]);
    const extend = e.shiftKey && track === selection.track;
    const at = snapTo(t, e.altKey);
    const anchor = extend
      ? Math.abs(at - selection.start) < Math.abs(at - selection.end)
        ? selection.end
        : selection.start
      : at;
    dragRef.current = { mode: 'select', anchor };
    setSelection({ track, start: Math.min(anchor, at), end: Math.max(anchor, at) });
    if (!extend) seek(at);
  };
  /** The clip a trim or gain drag would leave behind */
  const clipDraftAt = (
    d: Extract<Drag, { mode: 'trim' | 'gain' }>,
    e: React.PointerEvent
  ): Clip | null => {
    const clip = tracks.find((x) => x.id === d.track)?.clips[d.index];
    if (!clip) return null;
    if (d.mode === 'gain')
      return {
        ...clip,
        gain: Math.max(-36, Math.min(12, Math.round((d.db - (e.clientY - d.y) / 4) * 2) / 2)),
      };
    return resizeClip(
      clip,
      d.edge,
      toSample(snapTo(timeAt(e.clientX), e.altKey, { clips: [clip] }))
    );
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = timeAt(e.clientX);
    setHoverTime(t);
    const d = dragRef.current;
    if (d?.mode === 'select') {
      const at = snapTo(t, e.altKey);
      setSelection((s) => ({ ...s, start: Math.min(d.anchor, at), end: Math.max(d.anchor, at) }));
    } else if (d?.mode === 'move') {
      d.moved ||= Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4;
      if (!d.moved) return;
      d.at = snapBlock(t - d.grab, d.len, e.altKey, { clips: d.clips });
      // Every dragged clip stays on an existing lane
      const lanes = d.items.map((i) => i.lane);
      d.lanes = Math.max(
        -Math.min(...lanes),
        Math.min(tracks.length - 1 - Math.max(...lanes), laneIndexAt(e.clientY) - d.lane0)
      );
      setMove(
        d.items.map((i) => ({
          track: tracks[i.lane + d.lanes].id,
          at: i.at + d.at - d.start,
          len: i.len,
        }))
      );
    } else if (d?.mode === 'trim' || d?.mode === 'gain') {
      const clip = clipDraftAt(d, e);
      if (clip) setClipDraft({ track: d.track, index: d.index, clip });
    } else if (d?.mode === 'marquee') {
      const y = e.clientY - (lanesRef.current?.getBoundingClientRect().top ?? 0);
      setMarquee({ t0: d.t0, t1: t, y0: d.y0, y1: y });
      const [a, b] = [Math.min(d.t0, t), Math.max(d.t0, t)];
      const [l0, l1] = [
        Math.floor(Math.min(d.y0, y) / laneHeight),
        Math.floor(Math.max(d.y0, y) / laneHeight),
      ];
      setPicked(
        tracks.flatMap((tr, i) =>
          i < l0 || i > l1
            ? []
            : tr.clips.filter((c) => c.at / sampleRate < b && clipEnd(c) / sampleRate > a)
        )
      );
    } else if (d?.mode === 'fade') {
      const fade = fadeAt(d, e);
      if (fade) setFadeDraft({ track: d.track, clip: d.clip, edge: d.edge, fade });
    }
  };
  const endDrag = () => {
    dragRef.current = null;
    setMove(null);
    setSnapAt(null);
    setMarquee(null);
    setClipDraft(null);
    setFadeDraft(null);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    onPointerMove(e); // fast drags can release past the last move event
    const d = dragRef.current;
    endDrag();
    if (d?.mode === 'fade') {
      const fade = fadeAt(d, e);
      const old = tracks.find((t) => t.id === d.track)?.clips[d.clip]?.[fadeKey(d.edge)];
      if (fade && (fade.length !== (old?.length ?? 0) || fade.curve !== (old?.curve ?? 0)))
        setFade(d.track, d.clip, d.edge, fade);
      return;
    }
    if (d?.mode === 'trim' || d?.mode === 'gain') {
      const clip = clipDraftAt(d, e);
      const old = tracks.find((x) => x.id === d.track)?.clips[d.index];
      if (
        clip &&
        old &&
        (clip.at !== old.at ||
          clipEnd(clip) !== clipEnd(old) ||
          (clip.gain ?? 0) !== (old.gain ?? 0))
      )
        setClip(d.track, d.index, clip);
      return;
    }
    if (d?.mode !== 'move') return;
    // Ctrl while dropping copies instead of moving
    const copyDrop = e.ctrlKey || e.metaKey;
    if (d.moved) {
      if (d.clips)
        moveGroup(d.clips, d.lanes, toSample(d.at) - toSample(d.start), copyDrop, e.altKey);
      else moveSelection(tracks[d.lane0 + d.lanes].id, d.at, copyDrop);
    } else if (d.toggle) {
      // Ctrl+click a header picks or unpicks that clip
      const c = d.toggle;
      setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
    } else if (d.clips) {
      // A click on a header selects that one clip
      const tr = tracks[d.lane0];
      const clip = tr?.clips[clipIndexAt(tr, timeAt(d.x))];
      if (clip) {
        setSelection({
          track: tr.id,
          start: clip.at / sampleRate,
          end: clipEnd(clip) / sampleRate,
        });
        setPicked([clip]);
      }
    } else {
      // A click inside the selection just places the cursor
      const t = timeAt(e.clientX);
      setSelection({ ...selection, start: t, end: t });
      seek(t);
    }
  };
  /** Topmost (last drawn) clip of the track under time t, or -1 */
  const clipIndexAt = (track: Track | undefined, t: number) => {
    const s = toSample(t);
    const clips = track?.clips ?? [];
    for (let i = clips.length - 1; i >= 0; i--)
      if (clips[i].at <= s && s < clipEnd(clips[i])) return i;
    return -1;
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const track = tracks.find((t) => t.id === laneAt(e.clientY));
    const clip = track?.clips[clipIndexAt(track, timeAt(e.clientX))];
    if (track && clip)
      setSelection({
        track: track.id,
        start: clip.at / sampleRate,
        end: clipEnd(clip) / sampleRate,
      });
  };
  /** Grabbing a selection edge drags it while the opposite edge stays put */
  const onHandleDown = (e: React.PointerEvent, edge: 'start' | 'end') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    lanesRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'select',
      anchor: edge === 'start' ? selection.end : selection.start,
    };
  };
  /** Clip fade handles: the square sets the length, the dot bends the curve */
  const onFadeDown = (
    e: React.PointerEvent,
    track: number,
    clip: number,
    edge: FadeEdge,
    part: FadeDrag['part']
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    lanesRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: 'fade', track, clip, edge, part };
  };
  /** Clip edges trim and extend; the dB handle sets the clip's gain */
  const onClipDown = (e: React.PointerEvent, drag: Extract<Drag, { mode: 'trim' | 'gain' }>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    lanesRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = drag;
  };
  const fadeAt = (d: FadeDrag, e: React.PointerEvent): Fade | null => {
    const lane = tracks.findIndex((t) => t.id === d.track);
    const clip = tracks[lane]?.clips[d.clip];
    if (!clip) return null;
    // A fade edited by hand is no longer automatic
    const { length, curve } = clip[fadeKey(d.edge)] ?? { length: 0, curve: 0 };
    const own: Fade = { length, curve };
    if (d.part === 'curve') {
      const top = (lanesRef.current?.getBoundingClientRect().top ?? 0) + lane * laneHeight;
      return { ...own, curve: curveThrough(1 - (e.clientY - top) / laneHeight) };
    }
    const n = pcmLength(clip.pcm);
    const other = clip[fadeKey(d.edge === 'in' ? 'out' : 'in')]?.length ?? 0;
    const s = toSample(timeAt(e.clientX)) - clip.at;
    return { ...own, length: Math.max(0, Math.min(n - other, d.edge === 'in' ? s : n - s)) };
  };
  const setFade = (track: number, clip: number, edge: FadeEdge, fade: Fade) =>
    apply(tracks.map((t) => (t.id === track ? withFade(t, clip, edge, fade) : t)));

  /** Loop brace on the ruler: drag an edge to resize it, the bar to move it */
  const onLoopDown = (e: React.PointerEvent, part: 'start' | 'end' | 'body') => {
    if (e.button !== 0 || !loopRegion) return;
    e.stopPropagation();
    rulerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: 'loop', part, grab: timeAt(e.clientX) - loopRegion.start };
  };
  /** Markers on the ruler: click jumps there, drag moves, double-click removes */
  const onMarkerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    rulerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: 'marker', index, x: e.clientX, moved: false };
  };
  /** Ruler: a click moves the cursor; holding and dragging up or down zooms around that spot */
  const onRulerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = timeAt(e.clientX);
    seek(t);
    const view = viewRef.current;
    if (!view) return;
    rulerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'zoom',
      y: e.clientY,
      zoom,
      focus: t,
      anchor: e.clientX - view.getBoundingClientRect().left,
    };
  };
  const onRulerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const t = timeAt(e.clientX);
    if (d?.mode === 'zoom') {
      // Down zooms in, up zooms out: every 60 px doubles or halves. A few px of wobble on a click is ignored
      if (Math.abs(e.clientY - d.y) < 4) return;
      zoomTo(d.zoom * 2 ** ((e.clientY - d.y) / 60), d.focus, d.anchor);
      return;
    }
    if (d?.mode === 'marker') {
      d.moved ||= Math.abs(e.clientX - d.x) > 3;
      if (d.moved) setMarkerDraft({ index: d.index, t: snapTo(t, e.altKey, { marker: d.index }) });
      return;
    }
    if (d?.mode !== 'loop' || !loopRegion) return;
    const r = loopRegion;
    const minLen = span / 500;
    if (d.part === 'start')
      setLoopRegion({ ...r, start: Math.min(snapTo(t, e.altKey, { loop: true }), r.end - minLen) });
    else if (d.part === 'end')
      setLoopRegion({ ...r, end: Math.max(snapTo(t, e.altKey, { loop: true }), r.start + minLen) });
    else {
      const len = r.end - r.start;
      const start = Math.min(span - len, snapBlock(t - d.grab, len, e.altKey, { loop: true }));
      setLoopRegion({ start, end: start + len });
    }
  };
  const onRulerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d?.mode === 'zoom') {
      dragRef.current = null;
      return;
    }
    if (d?.mode === 'marker') {
      dragRef.current = null;
      setMarkerDraft(null);
      if (d.moved)
        setMarkers(
          markers.map((m, i) =>
            i === d.index ? snapTo(timeAt(e.clientX), e.altKey, { marker: d.index }) : m
          )
        );
      else seek(markers[d.index]);
      setSnapAt(null);
      return;
    }
    if (d?.mode !== 'loop') return;
    dragRef.current = null;
    setSnapAt(null);
    setLoopRegion((r) => r && { ...r }); // let playback pick up the final brace
  };

  /** Zooms keeping focus (seconds) at anchor px from the view's left edge; defaults to centering the selection or cursor */
  const zoomTo = (
    next: number,
    focus = hasSelection ? (selection.start + selection.end) / 2 : playhead,
    anchor?: number
  ) => {
    const view = viewRef.current;
    const z = Math.max(1, Math.min(MAX_ZOOM, next));
    setZoom(z);
    requestAnimationFrame(() => {
      if (view)
        view.scrollLeft = (focus / span) * view.scrollWidth - (anchor ?? view.clientWidth / 2);
    });
  };

  // Ctrl/Cmd + wheel zooms around the pointer; a plain wheel scrolls sideways while zoomed in, unless the lanes need it to scroll down.
  // In focus mode the page never scrolls: every wheel outside the side panels drives the timeline.
  // Native listener: React's wheel handler is passive and cannot preventDefault.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const view = viewRef.current;
    if (!view) return;
    const target = e.target as Element;
    const inView = view.contains(target);
    if (!inView && (!focusMode || target.closest?.('fieldset'))) return;
    const rect = view.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      zoomTo(
        zoom * (e.deltaY < 0 ? 1.25 : 0.8),
        ((view.scrollLeft + x) / view.scrollWidth) * span,
        x
      );
      return;
    }
    const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    const lanesScroll = view.scrollHeight > view.clientHeight;
    if (focusMode) {
      e.preventDefault();
      if (e.shiftKey || !vertical) view.scrollLeft += vertical ? e.deltaY : e.deltaX;
      else if (lanesScroll) view.scrollTop += e.deltaY;
      else view.scrollLeft += e.deltaY;
    } else if (zoom > 1 && !lanesScroll && vertical) {
      e.preventDefault();
      view.scrollLeft += e.deltaY;
    }
  };
  useEffect(() => {
    const onWheel = (e: WheelEvent) => wheelRef.current(e);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Focus mode pins the editor to the window and locks page scrolling (wide screens only, where the editor fits)
  useEffect(() => {
    if (!focusMode || !project || !window.matchMedia('(min-width: 1024px)').matches) return;
    workspaceRef.current?.scrollIntoView({ block: 'end' });
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = before;
    };
  }, [focusMode, project !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomToSelection = () => {
    if (!requireSelection()) return;
    zoomTo(span / (selection.end - selection.start));
  };

  // ---- keyboard ----
  /** Typing keeps its keys; buttons, checkboxes and sliders don't (Space must not press a focused button) */
  const isTyping = (target: EventTarget | null) =>
    target instanceof Element &&
    (Boolean(target.closest('textarea,select,[contenteditable="true"]')) ||
      (target instanceof HTMLInputElement &&
        !['checkbox', 'radio', 'range', 'button'].includes(target.type)));
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    // Dialogs keep their keys
    if (!project || isTyping(e.target) || document.querySelector('dialog[open]')) return;
    if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!e.repeat) setBypass(e.type === 'keydown');
      e.preventDefault();
      return;
    }
    if (e.code === 'Space') {
      // Swallow both halves: a focused button or checkbox activates on keyup
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'keydown' && !e.repeat) togglePlay();
      return;
    }
    if (e.type !== 'keydown' || busy) return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === 'y' || (key === 'z' && e.shiftKey)) redo();
      else if (key === 'z') undo();
      else if (key === 'c') copy();
      else if (key === 'x') cut();
      else if (key === 'v') paste();
      else if (key === 'd') duplicate();
      else if (key === 'l') loopSelection();
      else if (key === 'k') setPaletteOpen(true);
      else if (key === 'a' && active)
        setSelection({
          track: active.id,
          start: trackStart(active) / sampleRate,
          end: trackEnd(active) / sampleRate,
        });
      else return;
      e.preventDefault();
      return;
    }
    if (key === 'delete' || key === 'backspace') {
      if (!deletePicked()) deleteSelection();
    } else if (key === 'escape') {
      setSelection((s) => ({ ...s, start: playhead, end: playhead }));
      setPicked([]);
    } else if (key === 'm') addMarker();
    else if (key === ',') jumpMarker(-1);
    else if (key === '.') jumpMarker(1);
    else if (key === 'home') seek(0);
    else if (key === 'end') seek(duration);
    else if (key === '?') setKeysOpen(true);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    // Capture phase: runs before anything focused can react to the key
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, []);

  const pct = (t: number) => `${(t / span) * 100}%`;
  const lossy = LOSSY.includes(format);
  const exportSeconds = selectionOnly && hasSelection ? selection.end - selection.start : duration;
  const mixChannels = mix?.channels.length ?? 1;
  // FLAC depends on the content, so no estimate
  const estimate = !mix
    ? null
    : (format === 'wav'
        ? exportSeconds * (exportRate || sampleRate) * (exportMono ? 1 : mixChannels) * 2
        : lossy
          ? exportSeconds * kbps * 125
          : NaN) *
      takes *
      (distances ? DISTANCES.length : 1) *
      places.length *
      versions.length;
  const flatEq = !activeFx.eq.low && !activeFx.eq.mid && !activeFx.eq.high;
  const { gate: gateFx, overdrive: od, lpg, flanger, delay: echo, reverb: verb, clipper, pitchEnv } = activeFx;
  const setGlue = (patch: Partial<GlueSettings>) => setGlueSet((g) => ({ ...g, ...patch }));
  const setFx = (patch: Partial<typeof FX_DEFAULT>) => setFxState((f) => ({ ...f, ...patch }));
  const mixLevel = useMemo(
    () => (mix && matchLoudness ? { lufs: loudness(mix), peak: 20 * Math.log10(truePeak(mix)) } : null),
    [mix, matchLoudness]
  );

  // ---- dropping files from the desktop ----
  const dropTarget = (e: React.DragEvent) => {
    const row = Math.floor(
      (e.clientY - (lanesRef.current?.getBoundingClientRect().top ?? 0)) / laneHeight
    );
    return {
      track: row < tracks.length ? tracks[Math.max(0, row)].id : null,
      at: timeAt(e.clientX),
    };
  };
  const onDragOver = (e: React.DragEvent) => {
    if (busy || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const next = dropTarget(e);
    setDropAt((d) =>
      d && d.track === next.track && Math.abs(d.at - next.at) < span / 2000 ? d : next
    );
  };
  const onDrop = (e: React.DragEvent) => {
    if (busy || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDropAt(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void dropFiles(files, dropTarget(e));
  };

  return (
    <ToolPageLayout
      title="Audio Editor"
      description="Cut, move, layer and fade audio on multiple tracks, then export as MP3, WAV, OGG, FLAC or M4A. Everything runs in your browser."
      keywords="audio editor, multitrack audio editor, sfx editor, game sound effects, transient shaper, bitcrusher, reverb, noise gate, low pass gate, overdrive, flanger, delay, lufs normalization, cut mp3, trim audio, merge audio, combine mp3, audio equalizer, pitch shifter, audio converter, mp3 to wav, extract audio from video, normalize audio"
      canonicalUrl="/tools/audio-editor"
      pageTitle="Audio Editor - sLixTOOLS"
      pageDescription="Free online multitrack audio editor and converter: cut, move, layer, fade, EQ, compress, pitch-shift and normalize audio, shape game SFX, export MP3, WAV, OGG, FLAC or M4A. No uploads."
      breadcrumbLabel="Audio Editor"
      belowTool={seoContent}
      faq={[
        {
          question: 'Which files can I open?',
          answer:
            'Anything your browser can decode: MP3, WAV, OGG, FLAC, M4A/AAC, Opus and the soundtrack of most MP4 and WebM videos.',
        },
        {
          question: 'Can I layer several sounds?',
          answer:
            'Yes. Add audio on a new track, or add an empty track and drag parts onto it. The export mixes every unmuted track into one file.',
        },
        {
          question: 'Can I use it as an audio converter?',
          answer: 'Yes. Open a file and export it in another format without editing anything.',
        },
        {
          question: 'Does editing lose quality?',
          answer:
            'Edits run on the uncompressed audio. Only the final export to MP3, OGG or M4A compresses again; WAV and FLAC are lossless.',
        },
        {
          question: 'Is my audio uploaded?',
          answer: 'No. Decoding, editing and encoding all happen on your device.',
        },
      ]}
    >
      {!project || !file ? (
        <div className={toolDropzone}>
          <FileUploadArea
            fill
            onFileSelected={(f) => void load(f)}
            acceptedTypes={ACCEPTED}
            fileCategory="audio"
            title={busy ? 'Decoding...' : 'Drop your audio here'}
            description="MP3, WAV, OGG, FLAC, M4A, or a video to edit its sound"
          />
          <ul className={editorFeatures}>
            <li>Trim, cut &amp; move</li>
            <li>Multiple tracks</li>
            <li>Fade curves, volume &amp; EQ</li>
            <li>Live track effects</li>
            <li>Glue compressor</li>
            <li>Pitch, normalize &amp; reverse</li>
            <li>Export MP3, WAV, OGG, FLAC, M4A</li>
          </ul>
        </div>
      ) : (
        <div ref={workspaceRef} className={editorWorkspace}>
          <input
            ref={insertInputRef}
            type="file"
            hidden
            accept={ACCEPTED.map((e) => `.${e}`).join(',')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void insertFile(f);
              e.target.value = '';
            }}
          />
          <div className={toolbarRow}>
            <SourceChip
              icon={AudioWaveform}
              name={file.name}
              meta={formatFileSize(file.size)}
              onRemove={clear}
              disabled={busy}
            />
            <ToolbarDivider />
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              {iconBtn('Undo', undo, Undo2, { disabled: !canUndo || busy, shortcut: 'Ctrl+Z' })}
              {iconBtn('Redo', redo, Redo2, { disabled: !canRedo || busy, shortcut: 'Ctrl+Y' })}
              <div className="relative">
                {iconBtn('Undo history: jump back to any step', () => setHistoryOpen((o) => !o), History, {
                  disabled: (!canUndo && !canRedo) || busy,
                  pressed: historyOpen,
                })}
                {historyOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
                    <ol
                      aria-label="Undo history"
                      className="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl"
                    >
                      {[...past, project, ...future]
                        .map((step, i, all) => ({ i, step, text: describeStep(all[i - 1] ?? null, step) }))
                        // the empty editor before the first file isn't a step to go back to
                        .filter(({ step }) => step)
                        .reverse()
                        .map(({ i, text }) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => {
                                stop();
                                jump(i - past.length);
                                setHistoryOpen(false);
                              }}
                              aria-current={i === past.length ? 'step' : undefined}
                              className={cn(
                                'w-full truncate rounded-md px-2.5 py-1 text-left text-xs',
                                i === past.length
                                  ? 'bg-sky-500/20 text-sky-100'
                                  : i > past.length
                                    ? 'text-slate-500 hover:bg-white/5'
                                    : 'text-slate-300 hover:bg-white/5'
                              )}
                            >
                              {text}
                            </button>
                          </li>
                        ))}
                    </ol>
                  </>
                )}
              </div>
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
              {iconBtn('Cut', cut, Scissors, {
                disabled: !hasSelection || busy,
                shortcut: 'Ctrl+X',
              })}
              {iconBtn('Copy', copy, Copy, { disabled: !hasSelection || busy, shortcut: 'Ctrl+C' })}
              {iconBtn('Paste at the cursor', () => paste(), ClipboardPaste, {
                disabled: !clipboard || busy,
                shortcut: 'Ctrl+V',
              })}
              {iconBtn('Duplicate', duplicate, CopyPlus, {
                disabled: !hasSelection || busy,
                shortcut: 'Ctrl+D',
              })}
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
              {iconBtn('Trim: keep only the selected time, on every track', trimToSelection, Crop, {
                disabled: !hasSelection || busy,
              })}
              {iconBtn('Delete the selection and close the gap', deleteSelection, Trash2, {
                disabled: !hasSelection || busy,
                shortcut: 'Del',
              })}
              {iconBtn(
                'Silence the selection',
                () => requireSelection() && effect(silence),
                VolumeX,
                { disabled: !hasSelection || busy }
              )}
              {iconBtn('Trim silence at the start and end of the mix', trimSilence, Eraser, {
                disabled: busy,
              })}
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
              {iconBtn(
                `Fade in ${hasSelection ? 'the selection' : 'the track'}`,
                () => effect((p, s, e) => fade(p, s, e, 'in')),
                TrendingUp,
                { disabled: busy }
              )}
              {iconBtn(
                `Fade out ${hasSelection ? 'the selection' : 'the track'}`,
                () => effect((p, s, e) => fade(p, s, e, 'out')),
                TrendingDown,
                { disabled: busy }
              )}
              {iconBtn(
                `Normalize ${hasSelection ? 'the selection' : 'the track'}`,
                () => effect((p, s, e) => normalize(p, s, e)),
                AudioWaveform,
                { disabled: busy }
              )}
              {iconBtn(
                `Reverse ${hasSelection ? 'the selection' : 'the track'}`,
                () => effect(reverse),
                FlipHorizontal2,
                { disabled: busy }
              )}
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <div className="hidden items-center gap-1 lg:flex">
                {iconBtn(
                  focusMode
                    ? 'Focus mode on: the wheel drives the timeline, the page stays put'
                    : 'Focus mode',
                  toggleFocus,
                  Focus,
                  { pressed: focusMode }
                )}
              </div>
              <div className="hidden items-center gap-1 xl:flex">
                {iconBtn(
                  showLeft ? 'Hide project panel' : 'Show project panel',
                  toggleLeft,
                  PanelLeft,
                  { pressed: showLeft }
                )}
                {iconBtn(
                  showRight ? 'Hide sound panel' : 'Show sound panel',
                  toggleRight,
                  PanelRight,
                  { pressed: showRight }
                )}
              </div>
              {progress !== null && (
                <Progress
                  value={progress * 100}
                  aria-label="Export progress"
                  className="h-1.5 w-24"
                />
              )}
              <button
                type="button"
                onClick={() => void exportAudio()}
                disabled={busy}
                className={primaryButton}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {progress !== null
                  ? 'Exporting...'
                  : takes > 1
                    ? `Export ${takes} × ${format.toUpperCase()}`
                    : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Project panel: arrangement and output */}
            <fieldset
              disabled={busy}
              className={cn(
                sidePanel,
                'lg:order-last xl:order-none xl:border-l-0 xl:border-r',
                sideTab !== 'project' && 'lg:hidden',
                showLeft ? 'xl:block' : 'xl:hidden'
              )}
            >
              <div
                role="group"
                aria-label="Side panel"
                className={cn(segmentGroup, 'hidden w-full lg:flex xl:hidden')}
              >
                {(['project', 'sound'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={sideTab === t}
                    onClick={() => setSideTab(t)}
                    className={cn(segmentButton, 'flex-1 capitalize')}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <section className="space-y-2">
                <p className={cn(sectionLabel, 'mt-0')}>Add audio</p>
                <div className="grid grid-cols-2 gap-2">
                  {actionBtn(
                    'At cursor',
                    () => pickFile('cursor'),
                    Plus,
                    false,
                    'Insert another file into this track at the cursor'
                  )}
                  {actionBtn(
                    'At the end',
                    () => pickFile('end'),
                    Plus,
                    false,
                    'Append another file to this track'
                  )}
                  {actionBtn(
                    'New track',
                    () => pickFile('track'),
                    Layers,
                    false,
                    'Put another file on its own track, starting at the cursor'
                  )}
                  {actionBtn(
                    '1 s silence',
                    insertSilence,
                    Plus,
                    false,
                    'Insert one second of silence at the cursor'
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Or drop files onto a track, or below the last track to add a new one.
                </p>
              </section>

              {panelSection(
                'Generate',
                'new track at the cursor',
                <>
                  <SettingSlider
                    label="Length"
                    value={fx.genLen}
                    valueText={`${fx.genLen.toFixed(2)} s`}
                    onChange={(v) => setFx({ genLen: v })}
                    min={0.05}
                    max={3}
                    step={0.05}
                    disabled={busy}
                  />
                  <div role="group" aria-label="Noise color" className={segmentGroup}>
                    {NOISE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={fx.noiseColor === c}
                        onClick={() => setFx({ noiseColor: c })}
                        className={segmentButton}
                      >
                        {c[0].toUpperCase() + c.slice(1)} noise
                      </button>
                    ))}
                  </div>
                  {actionBtn(
                    'Add noise burst',
                    addNoise,
                    Wind,
                    false,
                    'Noise with a fast fade-out: layer it under hits, or filter it into whooshes and explosions'
                  )}
                  {freqSlider('Thump from', fx.thumpFrom, (v) => setFx({ thumpFrom: v }), busy, undefined, [20, 1000])}
                  {freqSlider('Thump to', fx.thumpTo, (v) => setFx({ thumpTo: v }), busy, undefined, [20, 1000])}
                  {actionBtn(
                    'Add sub thump',
                    addThump,
                    Drum,
                    false,
                    'A sine that glides from one pitch to the other: the chest punch under a shot or an explosion. Shorter hits harder'
                  )}
                  <div role="group" aria-label="Mechanics sound" className={segmentGroup}>
                    {MECH_KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={fx.mechKind === k}
                        onClick={() => setFx({ mechKind: k })}
                        className={segmentButton}
                      >
                        {MECH_LABELS[k]}
                      </button>
                    ))}
                  </div>
                  {actionBtn(
                    'Add mech sound',
                    addMech,
                    Wrench,
                    false,
                    'Synthesized metal: a bolt racked back and forward, a trigger click, a magazine seated, or a casing bouncing on concrete. New each time'
                  )}
                </>
              )}

              <section className="space-y-3 border-t border-white/10 pt-4">
                <p className={cn(sectionLabel, 'mt-0')}>Export</p>
                <div role="group" aria-label="Export format" className={segmentGroup}>
                  {FORMATS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={format === value}
                      onClick={() => setFormat(value)}
                      className={segmentButton}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {lossy && (
                  <div role="group" aria-label="Bitrate" className={segmentGroup}>
                    {BITRATES.map((b) => (
                      <button
                        key={b}
                        type="button"
                        aria-pressed={kbps === b}
                        onClick={() => setKbps(b)}
                        className={segmentButton}
                      >
                        {b} kbps
                      </button>
                    ))}
                  </div>
                )}
                <div role="group" aria-label="Sample rate" className={segmentGroup}>
                  {EXPORT_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={exportRate === r}
                      onClick={() => setExportRate(r)}
                      title={r ? undefined : `The project's sample rate: ${hz(sampleRate)}`}
                      className={segmentButton}
                    >
                      {r ? `${r / 1000} kHz` : 'Original'}
                    </button>
                  ))}
                </div>
                <label
                  className="flex items-center gap-2 text-sm text-slate-200"
                  title="Left and right averaged into one channel. A game plays the sounds it places in 3D in mono, and the file is half the size"
                >
                  <input
                    type="checkbox"
                    checked={exportMono}
                    onChange={(e) => setExportMono(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Mono
                </label>
                <label
                  className={cn(
                    'flex items-center gap-2 text-sm text-slate-200',
                    !hasSelection && 'opacity-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectionOnly && hasSelection}
                    disabled={!hasSelection}
                    onChange={(e) => setSelectionOnly(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Export only the selected time
                </label>
                <label
                  className={cn(
                    'flex items-center gap-2 text-sm text-slate-200',
                    !markers.length && 'opacity-50'
                  )}
                  title={markers.length ? undefined : 'Add markers first: press M'}
                >
                  <input
                    type="checkbox"
                    checked={splitMarkers && markers.length > 0}
                    disabled={!markers.length}
                    onChange={(e) => setSplitMarkers(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Split at markers
                </label>
                {splitMarkers && markers.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Every part between two markers becomes its own file in a ZIP, with the silence
                    around it trimmed. Lay shot, tail and reload out in a row and put markers in the
                    gaps.
                  </p>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={distances}
                    onChange={(e) => setDistances(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Distance versions
                </label>
                {distances && (
                  <p className="text-xs text-slate-500">
                    Three files per sound in a ZIP: close as it is, mid and far duller, softer and
                    with more of the surroundings. Blend between them by distance in the game. If
                    the game already turns far sounds down, tick Match loudness so all three are
                    equally loud.
                  </p>
                )}
                <p className={sectionLabel}>Fired in</p>
                <div role="group" aria-label="Where it is fired" className={segmentGroup}>
                  {(['', ...ENVIRONMENT_NAMES, 'all'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={place === p}
                      onClick={() => setPlace(p)}
                      title={
                        p === 'all'
                          ? 'One file per place, in a ZIP'
                          : p
                            ? undefined
                            : 'Dry: the place is left to the game'
                      }
                      className={segmentButton}
                    >
                      {p === 'all' ? 'All' : p ? PLACE_LABELS[p] : 'Dry'}
                    </button>
                  ))}
                </div>
                {place && (
                  <p className="text-xs text-slate-500">
                    Adds the place's echoes and reverb: Field a treeline far off, City slapback off the
                    houses, Canyon walls answering one after another, Indoor a short dense room.
                  </p>
                )}
                <label
                  className="flex items-center gap-2 text-sm text-slate-200"
                  title="Also export it through a suppressor: crack tamed, highs muffled, quieter. Tracks named Mech stay as they are, so the action still clacks"
                >
                  <input
                    type="checkbox"
                    checked={suppressedToo}
                    onChange={(e) => setSuppressedToo(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Suppressed version too
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={matchLoudness}
                    onChange={(e) => setMatchLoudness(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Match loudness
                  {mixLevel && (
                    <span
                      className={cn(
                        'ml-auto font-mono text-[11px] tabular-nums',
                        mixLevel.peak > -1 ? 'text-amber-300' : 'text-slate-400'
                      )}
                      title="The whole mix now: loudness, and its true peak (the highest level between the samples too)"
                    >
                      {Number.isFinite(mixLevel.lufs)
                        ? `now ${mixLevel.lufs.toFixed(1)} LUFS · ${mixLevel.peak.toFixed(1)} dBTP`
                        : 'silent'}
                    </span>
                  )}
                </label>
                {matchLoudness && (
                  <>
                    <div role="group" aria-label="Target loudness in LUFS" className={segmentGroup}>
                      {LUFS_TARGETS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={targetLufs === t}
                          onClick={() => setTargetLufs(t)}
                          className={segmentButton}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Target in LUFS, so every sound in a game plays equally loud. A limiter keeps
                      peaks under -1 dB, between the samples too (true peak).
                    </p>
                  </>
                )}
                <SettingSlider
                  label="Variations"
                  value={takes}
                  valueText={takes === 1 ? 'Off' : `${takes} files (ZIP)`}
                  onChange={setTakes}
                  min={1}
                  max={10}
                  step={1}
                  disabled={busy}
                  hint="Export several takes with random pitch and volume, so repeated sounds don't feel identical"
                />
                {takes > 1 && (
                  <>
                    <SettingSlider
                      label="Random pitch"
                      value={varyPitch}
                      valueText={`± ${varyPitch} semitones`}
                      onChange={setVaryPitch}
                      min={0}
                      max={6}
                      step={0.5}
                      disabled={busy}
                    />
                    <SettingSlider
                      label="Random volume"
                      value={varyVolume}
                      valueText={`0 to -${varyVolume} dB`}
                      onChange={setVaryVolume}
                      min={0}
                      max={12}
                      step={1}
                      disabled={busy}
                    />
                    <SettingSlider
                      label="Random tone"
                      value={varyTone}
                      valueText={varyTone ? `± ${varyTone} dB` : 'Off'}
                      onChange={setVaryTone}
                      min={0}
                      max={6}
                      step={0.5}
                      disabled={busy}
                      hint="Tilts each take a little brighter or darker"
                    />
                    <SettingSlider
                      label="Layer timing"
                      value={jitterMs}
                      valueText={jitterMs ? `0 to ${jitterMs} ms` : 'Off'}
                      onChange={setJitterMs}
                      min={0}
                      max={10}
                      step={0.5}
                      disabled={busy}
                      hint="Each layer of a take starts a little late at random, so the layers never line up the same way twice"
                    />
                  </>
                )}
                {muted.length > 0 && (
                  <p className="text-xs text-slate-500">Muted tracks are left out of the export.</p>
                )}
                {estimate !== null && !Number.isNaN(estimate) && (
                  <p className="text-xs text-slate-500">
                    Estimated size: ~{formatFileSize(estimate)}
                  </p>
                )}
              </section>

              {panelSection(
                'Auto-fire test',
                'plays what you export',
                <>
                  <SettingSlider
                    label="Fire rate"
                    value={fx.fireRate}
                    valueText={`${fx.fireRate} RPM`}
                    field={
                      <NumberField
                        label="Fire rate in rounds per minute"
                        value={fx.fireRate}
                        unit="RPM"
                        min={30}
                        max={1500}
                        onCommit={(v) => setFx({ fireRate: v })}
                        disabled={busy}
                      />
                    }
                    onChange={(v) => setFx({ fireRate: v })}
                    min={30}
                    max={1500}
                    step={10}
                    disabled={busy}
                  />
                  <SettingSlider
                    label="Shots"
                    value={fx.fireShots}
                    valueText={String(fx.fireShots)}
                    onChange={(v) => setFx({ fireShots: v })}
                    min={2}
                    max={30}
                    step={1}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Fire a burst',
                    testFire,
                    Crosshair,
                    false,
                    'Every shot is one of the variations, picked at random, and its tail rings over the next shot, like in a game'
                  )}
                  {actionBtn(
                    'Hear loop + tail',
                    hearLoop,
                    Repeat,
                    false,
                    'The shots as a loop that plays while the trigger is held (three times here), then the tail when it is let go'
                  )}
                  {actionBtn(
                    'Export loop + tail',
                    exportLoop,
                    Download,
                    busy,
                    'Two files in a ZIP: a seamless loop of the shots, every ring already wrapped into it, and the tail to play on release. Shot i is variation i'
                  )}
                  <p className="text-xs text-slate-500">
                    To fire only the shot, select it and tick "Export only the selected time".
                  </p>
                </>
              )}

              <p className="border-t border-white/10 pt-3 font-mono text-[11px] text-slate-500">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · {sampleRate} Hz{' '}
                {mixChannels === 1 ? 'mono' : mixChannels === 2 ? 'stereo' : `${mixChannels} ch`}
              </p>
            </fieldset>

            {/* Timeline */}
            <div className="order-first flex h-[26rem] min-w-0 flex-none flex-col lg:order-none lg:h-auto lg:min-h-0 lg:flex-1">
              {/* Transport */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-3 py-2">
                <div className="flex items-center gap-1">
                  {iconBtn('Jump to start', () => seek(0), SkipBack, { shortcut: 'Home' })}
                  <Tooltip label={playing ? 'Pause' : 'Play'} shortcut="Space">
                    <button
                      type="button"
                      aria-label={playing ? 'Pause' : 'Play'}
                      onClick={togglePlay}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-colors hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      {playing ? (
                        <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                  {iconBtn('Jump to end', () => seek(duration), SkipForward, { shortcut: 'End' })}
                  {iconBtn(
                    loop ? 'Loop on: playback repeats inside the brace on the ruler' : 'Loop',
                    toggleLoop,
                    Repeat,
                    { pressed: loop }
                  )}
                  {iconBtn('Set the loop to the selection', loopSelection, Crop, {
                    disabled: !hasSelection,
                    shortcut: 'Ctrl+L',
                  })}
                  {iconBtn(
                    follow
                      ? 'Follow on: the view scrolls with the playhead'
                      : 'Follow off: the view stays put',
                    toggleFollow,
                    LocateFixed,
                    { pressed: follow }
                  )}
                  {iconBtn(
                    snap ? 'Snapping on: hold Alt while dragging to place freely' : 'Snapping off',
                    toggleSnap,
                    Magnet,
                    { pressed: snap }
                  )}
                  {iconBtn(
                    autoXfade
                      ? 'Auto crossfade on: overlapping clips blend, and a dropped clip lines up in phase with the one under it (hold Alt to place it exactly)'
                      : 'Auto crossfade off: overlapping clips just add up',
                    toggleAutoXfade,
                    Blend,
                    { pressed: autoXfade }
                  )}
                  {iconBtn(
                    bypass
                      ? 'Bypass on: you hear every track as recorded, without effects (export is unchanged)'
                      : 'Bypass: hear it without effects, to compare (or hold B)',
                    () => setBypass((b) => !b),
                    Power,
                    { pressed: bypass }
                  )}
                  {iconBtn(
                    spectrum
                      ? 'Spectrogram on: low to high pitch from bottom to top, louder is brighter'
                      : 'Spectrogram: show pitch over time instead of the waveform',
                    toggleSpectrum,
                    Rainbow,
                    { pressed: spectrum }
                  )}
                  {iconBtn('Command palette: find any action by name', () => setPaletteOpen(true), Command, {
                    shortcut: 'Ctrl+K',
                  })}
                  {iconBtn('Keyboard shortcuts', () => setKeysOpen(true), Keyboard, { shortcut: '?' })}
                  <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />
                  {iconBtn('Add a marker at the cursor', addMarker, Flag, { shortcut: 'M' })}
                  {iconBtn('Previous marker', () => jumpMarker(-1), StepBack, {
                    disabled: !markers.length,
                    shortcut: ',',
                  })}
                  {iconBtn('Next marker', () => jumpMarker(1), StepForward, {
                    disabled: !markers.length,
                    shortcut: '.',
                  })}
                </div>
                <div className="font-mono tabular-nums" aria-label="Cursor position">
                  <span className="text-lg text-white">{formatTimecode(playhead)}</span>
                  <span className="text-sm text-slate-500"> / {formatTimecode(duration)}</span>
                </div>
                {hasSelection && (
                  <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-400/10 pl-3 pr-1 font-mono text-xs tabular-nums text-sky-200">
                    <span>
                      <span className="font-sans text-sky-300/80">Selection</span>{' '}
                      {formatTimecode(selection.start)} – {formatTimecode(selection.end)} (
                      {formatTimecode(selection.end - selection.start)})
                    </span>
                    <button
                      type="button"
                      aria-label="Clear selection"
                      onClick={() => setSelection({ ...selection, start: playhead, end: playhead })}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-sky-200 hover:bg-white/10"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 sm:ml-auto">
                  {iconBtn('Zoom out', () => zoomTo(zoom / 2), ZoomOut, {
                    disabled: zoom <= 1,
                    shortcut: 'Ctrl+Wheel',
                  })}
                  <span className="w-10 text-center font-mono text-xs tabular-nums text-slate-400">
                    {zoom < 10 ? zoom.toFixed(1).replace(/\.0$/, '') : Math.round(zoom)}×
                  </span>
                  {iconBtn('Zoom in', () => zoomTo(zoom * 2), ZoomIn, {
                    disabled: zoom >= MAX_ZOOM,
                    shortcut: 'Ctrl+Wheel',
                  })}
                  {iconBtn('Zoom to selection', zoomToSelection, ScanSearch, {
                    disabled: !hasSelection,
                  })}
                  {iconBtn('Show everything', () => zoomTo(1), Shrink, { disabled: zoom <= 1 })}
                </div>
              </div>
              {zoom > 1 && <Overview pcm={mix} view={viewRef} span={span} playhead={playhead} zoom={zoom} />}
              <div className="relative flex min-h-0 flex-1 bg-black/30">
                {/* Track column: scrolls with the lanes vertically, stays put horizontally */}
                <div className="relative w-32 shrink-0 border-r border-white/10 bg-slate-950/60">
                  <div ref={headerRef} className="absolute inset-0 overflow-hidden">
                    <div className="border-b border-white/10" style={{ height: RULER_H }} />
                    {tracks.map((track, i) => {
                      const isMuted = muted.includes(track.id);
                      const isSolo = soloed.includes(track.id);
                      const current = track === active && tracks.length > 1;
                      const pan = Math.round(fxOf(track).pan * 100);
                      const level = levelOf(track);
                      const db = level > 0 ? 20 * Math.log10(level) : -Infinity;
                      return (
                        <div
                          key={track.id}
                          className={cn(
                            'flex flex-col gap-1 border-b border-white/10 p-1',
                            current && 'bg-white/[0.05]',
                            !audible(track.id) && 'opacity-60'
                          )}
                          style={{ height: laneHeight }}
                        >
                          <div className="flex items-center gap-0.5">
                            <Tooltip label="Show this track's effects">
                              <button
                                type="button"
                                aria-pressed={track === active}
                                onClick={() =>
                                  setSelection({ track: track.id, start: playhead, end: playhead })
                                }
                                className={cn(
                                  'h-6 min-w-0 flex-1 truncate rounded px-1.5 text-left text-xs hover:bg-white/10',
                                  current ? 'font-medium text-white' : 'text-slate-400'
                                )}
                              >
                                {track.name || `Track ${i + 1}`}
                                {fxActive(fxOf(track)) && (
                                  <span className="ml-1 rounded bg-amber-300/20 px-1 text-[10px] font-medium text-amber-200">
                                    FX
                                  </span>
                                )}
                              </button>
                            </Tooltip>
                            <Tooltip
                              label={isSolo ? 'Unsolo track' : 'Solo: hear only soloed tracks'}
                            >
                              <button
                                type="button"
                                aria-label={
                                  isSolo ? `Unsolo track ${i + 1}` : `Solo track ${i + 1}`
                                }
                                aria-pressed={isSolo}
                                onClick={() => toggleSolo(track.id)}
                                className={cn(
                                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold hover:bg-white/10',
                                  isSolo ? 'bg-sky-400/25 text-sky-200' : 'text-slate-400'
                                )}
                              >
                                S
                              </button>
                            </Tooltip>
                            <Tooltip label={isMuted ? 'Unmute track' : 'Mute track'}>
                              <button
                                type="button"
                                aria-label={
                                  isMuted ? `Unmute track ${i + 1}` : `Mute track ${i + 1}`
                                }
                                aria-pressed={isMuted}
                                onClick={() => toggleMute(track.id)}
                                className={cn(
                                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-white/10',
                                  isMuted ? 'text-amber-300' : 'text-slate-400'
                                )}
                              >
                                {isMuted ? (
                                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                              </button>
                            </Tooltip>
                            {tracks.length > 1 && (
                              <Tooltip label="Remove track">
                                <button
                                  type="button"
                                  aria-label={`Remove track ${i + 1}`}
                                  disabled={busy}
                                  onClick={() => removeTrack(track.id)}
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/10"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                          <label
                            className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500"
                            title="Pan: double-click to center"
                          >
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              step={5}
                              value={pan}
                              disabled={busy}
                              aria-label={`Pan track ${i + 1}`}
                              onChange={(e) =>
                                setTrackFx(track.id, { pan: Number(e.target.value) / 100 })
                              }
                              onDoubleClick={() => pan && setTrackFx(track.id, { pan: 0 })}
                              className="h-1 min-w-0 flex-1 accent-sky-400"
                            />
                            <span className="w-7 text-right font-mono tabular-nums">
                              {panText(pan)}
                            </span>
                          </label>
                          <div
                            className="mx-1 h-1.5 overflow-hidden rounded-full bg-white/10"
                            role="meter"
                            aria-label={`Track ${i + 1} level`}
                            aria-valuenow={Math.round(level * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={cn(
                                'h-full',
                                level >= 0.99
                                  ? 'bg-red-400'
                                  : db > -6
                                    ? 'bg-amber-300'
                                    : 'bg-emerald-400'
                              )}
                              style={{
                                width: `${Math.max(0, Math.min(1, (db + 48) / 48)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-1 px-1" style={{ height: ADD_ROW_H }}>
                      <button
                        type="button"
                        onClick={addTrack}
                        disabled={busy}
                        className={cn(chipButton, 'h-7 min-w-0 flex-1 justify-center text-xs')}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add track
                      </button>
                      <Tooltip label="Add weapon layers: empty tracks named Transient, Body, Mech, Tail and Sub, each with the filter its job starts with">
                        <button
                          type="button"
                          onClick={addLayers}
                          disabled={busy}
                          aria-label="Add weapon layers"
                          className={cn(chipButton, 'h-7 px-2')}
                        >
                          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Line up attacks: move the other tracks so they hit at the same moment as the active one">
                        <button
                          type="button"
                          onClick={alignAttacks}
                          disabled={busy || tracks.length < 2}
                          aria-label="Line up attacks"
                          className={cn(chipButton, 'h-7 px-2')}
                        >
                          <AlignStartVertical className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </div>
                    {/* Room for the lanes' horizontal scrollbar */}
                    <div className="h-5" />
                  </div>
                </div>
                <div className="relative min-w-0 flex-1">
                  <div
                    ref={viewRef}
                    className="h-full overflow-auto"
                    onDragOver={onDragOver}
                    onDragLeave={(e) =>
                      !e.currentTarget.contains(e.relatedTarget as Node) && setDropAt(null)
                    }
                    onDrop={onDrop}
                    onScroll={(e) =>
                      headerRef.current && (headerRef.current.scrollTop = e.currentTarget.scrollTop)
                    }
                  >
                    <div ref={contentRef} className="relative" style={{ width: canvasWidth }}>
                      {/* Ruler: click to move the cursor */}
                      <div
                        ref={rulerRef}
                        className="sticky top-0 z-30 cursor-pointer select-none overflow-hidden border-b border-white/10 bg-slate-950"
                        style={{ height: RULER_H }}
                        onPointerDown={onRulerDown}
                        onPointerMove={onRulerMove}
                        onPointerUp={onRulerUp}
                        onPointerCancel={onRulerUp}
                        onDoubleClick={toggleLoop}
                        aria-hidden="true"
                      >
                        {loopRegion && (
                          <div
                            title="Loop: drag to move, drag the ends to resize, double-click the ruler to switch it on or off"
                            className="absolute top-0 z-10 h-1.5 cursor-grab"
                            style={{
                              left: pct(loopRegion.start),
                              width: pct(loopRegion.end - loopRegion.start),
                            }}
                            onPointerDown={(e) => onLoopDown(e, 'body')}
                            onDoubleClick={(e) => e.stopPropagation()}
                          >
                            {/* Thin visible strip above the tick labels; the parent is the grab area */}
                            <div
                              className={cn(
                                'h-[3px] rounded-b-sm',
                                loop ? 'bg-amber-300/90' : 'bg-slate-500/60'
                              )}
                            />
                            {(['start', 'end'] as const).map((part) => (
                              <div
                                key={part}
                                className={cn(
                                  'absolute inset-y-0 w-2 cursor-ew-resize',
                                  part === 'start' ? 'left-0' : 'right-0'
                                )}
                                onPointerDown={(e) => onLoopDown(e, part)}
                              />
                            ))}
                          </div>
                        )}
                        {shownMarkers.map((m, i) => (
                          <div
                            key={`m${i}`}
                            title="Marker: click to jump, drag to move, double-click to remove"
                            className="absolute bottom-0 z-20 h-3 w-3 -translate-x-1/2 cursor-grab bg-emerald-300 [clip-path:polygon(0_0,100%_0,50%_100%)]"
                            style={{ left: pct(m) }}
                            onPointerDown={(e) => onMarkerDown(e, i)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setMarkers(markers.filter((_, j) => j !== i));
                            }}
                          />
                        ))}
                        {ticks.map((t) => (
                          <div key={t} className="absolute inset-y-0" style={{ left: pct(t) }}>
                            <span className="absolute left-1 top-1 whitespace-nowrap font-mono text-[10px] text-slate-500">
                              {tickLabel(t)}
                            </span>
                            <span className="absolute bottom-0 left-0 h-2 w-px bg-white/25" />
                          </div>
                        ))}
                        <div
                          className="absolute bottom-0 h-3 w-0.5 -translate-x-1/2 bg-amber-300"
                          style={{ left: pct(playhead) }}
                        />
                      </div>

                      <div
                        ref={lanesRef}
                        className={cn(
                          'relative touch-none select-none',
                          move ? 'cursor-grabbing' : 'cursor-text'
                        )}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={endDrag}
                        onPointerLeave={() => setHoverTime(null)}
                        onDoubleClick={onDoubleClick}
                        role="group"
                        aria-label="Tracks: click to place the cursor, drag to select, drag a selection or a clip's header to move it"
                      >
                        {tracks.map((track) => {
                          const selected = hasSelection && track.id === selection.track;
                          let shown =
                            fadeDraft?.track === track.id
                              ? withFade(track, fadeDraft.clip, fadeDraft.edge, fadeDraft.fade)
                                  .clips
                              : track.clips;
                          if (clipDraft?.track === track.id)
                            shown = shown.map((c, ci) =>
                              ci === clipDraft.index ? clipDraft.clip : c
                            );
                          return (
                            <div
                              key={track.id}
                              className={cn(
                                'relative border-b border-white/10',
                                track === active && tracks.length > 1 && 'bg-white/[0.03]'
                              )}
                              style={{ height: laneHeight }}
                            >
                              <LaneCanvas
                                clips={shown}
                                sampleRate={sampleRate}
                                span={span}
                                width={canvasWidth}
                                height={laneHeight}
                                muted={!audible(track.id)}
                                selStart={selected ? selection.start : 0}
                                selEnd={selected ? selection.end : 0}
                                spectrum={spectrum}
                              />
                              {selected && (
                                <>
                                  <div
                                    className={cn(
                                      'absolute inset-y-0 bg-sky-400/10 ring-1 ring-inset ring-sky-300/60',
                                      move ? 'opacity-40' : 'cursor-grab'
                                    )}
                                    style={{
                                      left: pct(selection.start),
                                      width: pct(selection.end - selection.start),
                                    }}
                                  />
                                  {(['start', 'end'] as const).map((edge) => (
                                    <div
                                      key={edge}
                                      className="group absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize"
                                      style={{ left: pct(selection[edge]) }}
                                      onPointerDown={(e) => onHandleDown(e, edge)}
                                    >
                                      <div className="absolute left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.8)] transition-transform group-hover:scale-y-125" />
                                    </div>
                                  ))}
                                </>
                              )}
                              {move
                                ?.filter((m) => m.track === track.id)
                                .map((m, gi) => (
                                  <div
                                    key={`g${gi}`}
                                    className="pointer-events-none absolute inset-y-1 rounded border-2 border-dashed border-sky-300 bg-sky-400/20"
                                    style={{ left: pct(m.at), width: pct(m.len) }}
                                  />
                                ))}
                              {shown.map((clip, ci) => {
                                const whole =
                                  selected &&
                                  Math.abs(selection.start - clip.at / sampleRate) < 1e-6 &&
                                  Math.abs(selection.end - clipEnd(clip) / sampleRate) < 1e-6;
                                const len = pcmLength(clip.pcm) / sampleRate;
                                const db = clip.gain ?? 0;
                                const original = track.clips[ci];
                                return [
                                  <div
                                    key={`h${ci}`}
                                    title="Drag to move the clip (hold Ctrl when dropping to copy), click to select it, Ctrl+click to pick several"
                                    className={cn(
                                      'absolute top-0 z-20 cursor-grab border-x border-sky-400/40 hover:bg-sky-400/40',
                                      whole || picked.includes(original)
                                        ? 'bg-sky-300/60'
                                        : 'bg-sky-400/25',
                                      move && 'pointer-events-none'
                                    )}
                                    style={{
                                      left: pct(clip.at / sampleRate),
                                      width: pct(len),
                                      height: CLIP_HEAD_H,
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setClipMenu({ x: e.clientX, y: e.clientY, track: track.id, index: ci });
                                    }}
                                  />,
                                  ...(['start', 'end'] as const).map((edge) => (
                                    <div
                                      key={`t${ci}${edge}`}
                                      title={
                                        edge === 'start'
                                          ? 'Drag to trim or extend the clip start'
                                          : 'Drag to trim or extend the clip end'
                                      }
                                      className={cn(
                                        'absolute bottom-0 z-20 w-2 cursor-ew-resize hover:bg-sky-300/30',
                                        edge === 'end' && '-translate-x-full',
                                        move && 'pointer-events-none'
                                      )}
                                      style={{
                                        left: pct(
                                          edge === 'start'
                                            ? clip.at / sampleRate
                                            : clipEnd(clip) / sampleRate
                                        ),
                                        top: CLIP_HEAD_H,
                                      }}
                                      onPointerDown={(e) =>
                                        onClipDown(e, {
                                          mode: 'trim',
                                          track: track.id,
                                          index: ci,
                                          edge,
                                        })
                                      }
                                      onDoubleClick={(e) => e.stopPropagation()}
                                    />
                                  )),
                                  (len / span) * canvasWidth > 40 && (
                                    <div
                                      key={`v${ci}`}
                                      title="Clip gain: drag up or down, double-click for 0 dB"
                                      className={cn(
                                        'absolute z-20 -translate-x-1/2 cursor-ns-resize whitespace-nowrap rounded-full bg-black/70 px-1.5 font-mono text-[10px] leading-4 hover:bg-black',
                                        db ? 'text-sky-200' : 'text-slate-500',
                                        move && 'pointer-events-none'
                                      )}
                                      style={{
                                        left: pct(clip.at / sampleRate + len / 2),
                                        top: CLIP_HEAD_H + 2,
                                      }}
                                      onPointerDown={(e) =>
                                        onClipDown(e, {
                                          mode: 'gain',
                                          track: track.id,
                                          index: ci,
                                          y: e.clientY,
                                          db,
                                        })
                                      }
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if (db && original)
                                          setClip(track.id, ci, { ...original, gain: 0 });
                                      }}
                                    >
                                      {db ? signed(db, 'dB') : '0 dB'}
                                    </div>
                                  ),
                                ];
                              })}
                              {shown.flatMap((clip, ci) =>
                                (['in', 'out'] as const).flatMap((edge) => {
                                  const f = clip[fadeKey(edge)];
                                  const len = f?.length ?? 0;
                                  const at =
                                    (edge === 'in' ? clip.at + len : clipEnd(clip) - len) /
                                    sampleRate;
                                  const mid =
                                    (edge === 'in' ? clip.at + len / 2 : clipEnd(clip) - len / 2) /
                                    sampleRate;
                                  const name = edge === 'in' ? 'Fade in' : 'Fade out';
                                  const dragging =
                                    fadeDraft?.track === track.id &&
                                    fadeDraft.clip === ci &&
                                    fadeDraft.edge === edge;
                                  const handle =
                                    'absolute z-30 h-3 w-3 border border-amber-300 bg-slate-950/80 hover:bg-amber-300';
                                  return [
                                    <div
                                      key={`${ci}${edge}`}
                                      title={`${name}: drag sideways`}
                                      className={cn(
                                        handle,
                                        'top-0 cursor-ew-resize rounded-sm',
                                        edge === 'out' && '-translate-x-full'
                                      )}
                                      style={{ left: pct(at) }}
                                      onPointerDown={(e) =>
                                        onFadeDown(e, track.id, ci, edge, 'length')
                                      }
                                      onDoubleClick={(e) => e.stopPropagation()}
                                    />,
                                    f && len > 0 && (
                                      <div
                                        key={`${ci}${edge}c`}
                                        title={`${name} curve: drag up or down, double-click to straighten`}
                                        className={cn(
                                          handle,
                                          '-translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full'
                                        )}
                                        style={{
                                          left: pct(mid),
                                          top: `${(1 - fadeCurve(0.5, f.curve)) * 100}%`,
                                        }}
                                        onPointerDown={(e) =>
                                          onFadeDown(e, track.id, ci, edge, 'curve')
                                        }
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          if (f.curve)
                                            setFade(track.id, ci, edge, { ...f, curve: 0 });
                                        }}
                                      />
                                    ),
                                    dragging && (
                                      <div
                                        key={`${ci}${edge}l`}
                                        className="pointer-events-none absolute top-4 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-amber-200"
                                        style={{ left: pct(mid) }}
                                      >
                                        {Math.round((len / sampleRate) * 1000)} ms
                                        {f?.curve
                                          ? ` · curve ${signed(Math.round(f.curve * 100), '%')}`
                                          : ''}
                                      </div>
                                    ),
                                  ];
                                })
                              )}
                            </div>
                          );
                        })}
                        {dropAt && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-40 border-2 border-dashed border-emerald-300 bg-emerald-400/15"
                            style={{
                              top:
                                (dropAt.track === null
                                  ? tracks.length
                                  : tracks.findIndex((t) => t.id === dropAt.track)) * laneHeight,
                              height: dropAt.track === null ? ADD_ROW_H : laneHeight,
                            }}
                          >
                            <div
                              className="absolute inset-y-0 w-0.5 bg-emerald-300"
                              style={{ left: pct(dropAt.at) }}
                            >
                              <span className="absolute left-1.5 top-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-emerald-200">
                                {dropAt.track === null
                                  ? 'New track'
                                  : `Track ${tracks.findIndex((t) => t.id === dropAt.track) + 1}`}{' '}
                                at {formatTimecode(dropAt.at)}
                              </span>
                            </div>
                          </div>
                        )}
                        {shownMarkers.map((m, i) => (
                          <div
                            key={`m${i}`}
                            className="pointer-events-none absolute inset-y-0 w-px bg-emerald-300/40"
                            style={{ left: pct(m) }}
                          />
                        ))}
                        {marquee && (
                          <div
                            className="pointer-events-none absolute z-40 border border-sky-300 bg-sky-400/10"
                            style={{
                              left: pct(Math.min(marquee.t0, marquee.t1)),
                              width: pct(Math.abs(marquee.t1 - marquee.t0)),
                              top: Math.min(marquee.y0, marquee.y1),
                              height: Math.abs(marquee.y1 - marquee.y0),
                            }}
                          />
                        )}
                        {snapAt !== null && (
                          <div
                            className="pointer-events-none absolute inset-y-0 z-40 w-px bg-fuchsia-300"
                            style={{ left: pct(snapAt) }}
                          />
                        )}
                        {hoverTime !== null && (
                          <div
                            className="pointer-events-none absolute inset-y-0 w-px bg-white/30"
                            style={{ left: pct(hoverTime) }}
                          >
                            <span className="absolute left-1 top-1 rounded bg-black/70 px-1 font-mono text-[10px] text-slate-200">
                              {formatTimecode(
                                move ? Math.min(...move.map((m) => m.at)) : hoverTime
                              )}
                            </span>
                          </div>
                        )}
                        <div
                          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
                          style={{ left: pct(playhead) }}
                        />
                      </div>

                      <div
                        className="sticky left-0 flex items-center gap-3 overflow-hidden px-3"
                        style={{ height: ADD_ROW_H, width: viewSize.width }}
                      >
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-dashed border-white/15 px-3 py-1 text-xs text-slate-500">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Drop audio files here for a new track
                        </span>
                        <span className="truncate text-xs text-slate-500">
                          {hasSelection
                            ? 'Drag the selection to move it, also onto another track. Ctrl on drop copies.'
                            : "Drag across a track to select, drag a clip's header to move it, Ctrl+drag to pick clips"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sound panel: processes the selection, or the whole track */}
            <fieldset
              disabled={busy}
              className={cn(
                sidePanel,
                sideTab !== 'sound' && 'lg:hidden',
                showRight ? 'xl:block' : 'xl:hidden'
              )}
            >
              <div className="-mx-4 -mt-4 space-y-2 border-b border-white/10 bg-slate-950 px-4 py-3 lg:sticky lg:-top-4 lg:z-10">
                <div
                  role="group"
                  aria-label="Side panel"
                  className={cn(segmentGroup, 'hidden w-full lg:flex xl:hidden')}
                >
                  {(['project', 'sound'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={sideTab === t}
                      onClick={() => setSideTab(t)}
                      className={cn(segmentButton, 'flex-1 capitalize')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    aria-label="Track name"
                    title="Name this track"
                    value={active?.name ?? ''}
                    placeholder={`Track ${tracks.indexOf(active) + 1}`}
                    maxLength={24}
                    onChange={(e) => renameTrack(e.target.value)}
                    className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-slate-200 placeholder:text-slate-200 hover:border-white/10 focus:border-sky-400 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <Tooltip label="Bake: render the effects into the track's audio and switch them off">
                      <button
                        type="button"
                        className={cn(chipButton, 'h-7 text-xs')}
                        disabled={busy || !fxActive(activeFx) || !active?.clips.length}
                        onClick={bakeFx}
                      >
                        <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
                        Bake
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      className={cn(chipButton, 'h-7 text-xs')}
                      disabled={!fxActive(activeFx)}
                      onClick={() => setActiveFx(NO_FX)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip label="Copy this track's effects, to paste them on another track">
                    <button
                      type="button"
                      aria-label="Copy effects"
                      className={cn(chipButton, 'h-7 px-2')}
                      onClick={() => {
                        setFxClipboard(activeFx);
                        toast.success('Effects copied');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Paste the copied effects on this track. Its volume and pan stay">
                    <button
                      type="button"
                      aria-label="Paste effects"
                      className={cn(chipButton, 'h-7 px-2')}
                      disabled={!fxClipboard}
                      onClick={() => fxClipboard && loadFx(fxClipboard)}
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  {Object.keys(presets).length > 0 && (
                    <select
                      aria-label="Load a preset"
                      title="Load a saved effect chain on this track. Its volume and pan stay"
                      value=""
                      onChange={(e) => {
                        const saved = presets[e.target.value];
                        if (!saved) return;
                        loadFx(saved);
                        setPresetName(e.target.value);
                      }}
                      className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-1 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="">Load preset…</option>
                      {Object.keys(presets).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    aria-label="Preset name"
                    value={presetName}
                    placeholder="Preset name"
                    maxLength={40}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                  <Tooltip label="Save this track's effects as a preset under the name. Presets stay in this browser">
                    <button
                      type="button"
                      aria-label="Save preset"
                      className={cn(chipButton, 'h-7 px-2')}
                      disabled={!presetName.trim()}
                      onClick={() => {
                        storePresets({ ...presets, [presetName.trim()]: activeFx });
                        setPresetName(presetName.trim());
                        toast.success(`Preset "${presetName.trim()}" saved`);
                      }}
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete the preset with this name">
                    <button
                      type="button"
                      aria-label="Delete preset"
                      className={cn(chipButton, 'h-7 px-2')}
                      disabled={!(presetName in presets)}
                      onClick={() => {
                        storePresets(
                          Object.fromEntries(Object.entries(presets).filter(([name]) => name !== presetName))
                        );
                        setPresetName('');
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <section className="space-y-3">
                <SettingSlider
                  label="Volume"
                  value={activeFx.volume}
                  valueText={signed(activeFx.volume, 'dB')}
                  onChange={(v) => setActiveFx({ volume: v })}
                  min={-24}
                  max={12}
                  step={1}
                  disabled={busy}
                />
                <SettingSlider
                  label="Pan"
                  value={Math.round(activeFx.pan * 100)}
                  valueText={panText(Math.round(activeFx.pan * 100))}
                  onChange={(v) => setActiveFx({ pan: v / 100 })}
                  min={-100}
                  max={100}
                  step={5}
                  disabled={busy}
                />
                <SettingSlider
                  label="Pitch"
                  value={activeFx.semitones}
                  valueText={signed(
                    activeFx.semitones,
                    Math.abs(activeFx.semitones) === 1 ? 'semitone' : 'semitones'
                  )}
                  onChange={(v) => setActiveFx({ semitones: v })}
                  min={-12}
                  max={12}
                  step={1}
                  disabled={busy}
                />
              </section>

              <div className="flex flex-col gap-5">
              {fxGroup(
                'Pitch envelope',
                pitchEnv.amount ? 'on' : '',
                <>
                  {slide(
                    'Starts at',
                    pitchEnv.amount,
                    pitchEnv.amount
                      ? signed(pitchEnv.amount, Math.abs(pitchEnv.amount) === 1 ? 'semitone' : 'semitones')
                      : 'Off',
                    (v) => setFxPart('pitchEnv', { amount: v }),
                    [-24, 24, 1],
                    'The sound starts this far off its pitch and glides back. Above 0 falls like a shot or a laser, below 0 rises like a swell'
                  )}
                  {slide(
                    'Glide',
                    pitchEnv.time,
                    `${pitchEnv.time} ms`,
                    (v) => setFxPart('pitchEnv', { time: v }),
                    [5, 500, 5],
                    'Begins at the first sound on the track, which gets a little shorter or longer'
                  )}
                </>,
                fav('Pitch envelope')
              )}

              {fxGroup(
                'Volume gate',
                gateFx.threshold > GATE_OFF ? 'on' : '',
                <>
                  {slide(
                    'Threshold',
                    gateFx.threshold,
                    gateFx.threshold > GATE_OFF ? `${gateFx.threshold} dB` : 'Off',
                    (v) => setFxPart('gate', { threshold: v }),
                    [GATE_OFF, 0, 1],
                    'Everything quieter than this is turned down: cuts hiss, room noise and long tails'
                  )}
                  {slide(
                    'Range',
                    gateFx.range,
                    gateFx.range >= 80 ? 'Mute' : `-${gateFx.range} dB`,
                    (v) => setFxPart('gate', { range: v }),
                    [3, 80, 1],
                    'How far the closed gate turns the sound down'
                  )}
                  {slide(
                    'Attack',
                    gateFx.attack,
                    `${gateFx.attack} ms`,
                    (v) => setFxPart('gate', { attack: v }),
                    [0, 50, 0.5],
                    'The gate opens this early, so hits keep their full snap'
                  )}
                  {slide('Hold', gateFx.hold, `${gateFx.hold} ms`, (v) => setFxPart('gate', { hold: v }), [0, 500, 5])}
                  {slide(
                    'Release',
                    gateFx.release,
                    `${gateFx.release} ms`,
                    (v) => setFxPart('gate', { release: v }),
                    [5, 1000, 5]
                  )}
                </>,
                fav('Volume gate')
              )}

              {fxGroup(
                'Punch',
                activeFx.attack || activeFx.sustain || activeFx.drive ? 'on' : '',
                <>
                  <SettingSlider
                    label="Attack"
                    value={activeFx.attack}
                    valueText={signed(activeFx.attack, 'dB')}
                    onChange={(v) => setActiveFx({ attack: v })}
                    min={-12}
                    max={12}
                    step={1}
                    disabled={busy}
                    hint="Snappier or softer hits"
                  />
                  <SettingSlider
                    label="Sustain"
                    value={activeFx.sustain}
                    valueText={signed(activeFx.sustain, 'dB')}
                    onChange={(v) => setActiveFx({ sustain: v })}
                    min={-12}
                    max={12}
                    step={1}
                    disabled={busy}
                    hint="Longer or shorter body after the hit"
                  />
                  <SettingSlider
                    label="Saturation"
                    value={activeFx.drive}
                    valueText={activeFx.drive ? `${activeFx.drive} dB drive` : 'Off'}
                    onChange={(v) => setActiveFx({ drive: v })}
                    min={0}
                    max={30}
                    step={1}
                    disabled={busy}
                  />
                </>,
                fav('Punch')
              )}

              {fxGroup(
                'Overdrive',
                od.mix ? 'on' : '',
                <>
                  {percent(
                    'Dry / wet',
                    od.mix,
                    (v) => setFxPart('overdrive', { mix: v }),
                    'Distorts one frequency band; the level stays where it was',
                    'Off'
                  )}
                  {slide('Drive', od.drive, `${od.drive} dB`, (v) => setFxPart('overdrive', { drive: v }), [0, 48, 1])}
                  {freqSlider('Band', od.freq, (v) => setFxPart('overdrive', { freq: v }), busy)}
                  {slide(
                    'Band width',
                    od.width,
                    `${od.width} oct`,
                    (v) => setFxPart('overdrive', { width: v }),
                    [0.5, 8, 0.5],
                    'Narrow drives only around the band, wide drives everything'
                  )}
                  {slide(
                    'Tone',
                    Math.round(od.tone * 100),
                    od.tone ? `${Math.abs(Math.round(od.tone * 100))} % ${od.tone > 0 ? 'brighter' : 'darker'}` : 'Neutral',
                    (v) => setFxPart('overdrive', { tone: v / 100 }),
                    [-100, 100, 5]
                  )}
                  {percent(
                    'Dynamics',
                    od.dynamics,
                    (v) => setFxPart('overdrive', { dynamics: v }),
                    'Low squashes everything to one level, high keeps hits loud and tails quiet'
                  )}
                </>,
                fav('Overdrive')
              )}

              {fxGroup(
                'Lo-fi',
                activeFx.bits < 16 || activeFx.rate ? 'on' : '',
                <>
                  <SettingSlider
                    label="Bit depth"
                    value={activeFx.bits}
                    valueText={activeFx.bits < 16 ? `${activeFx.bits} bit` : 'Off'}
                    onChange={(v) => setActiveFx({ bits: v })}
                    min={2}
                    max={16}
                    step={1}
                    disabled={busy}
                  />
                  {listSlider(
                    'Sample rate',
                    CRUSH_RATES,
                    activeFx.rate,
                    (v) => setActiveFx({ rate: v }),
                    (v) => (v ? hz(v) : 'Off'),
                    busy
                  )}
                </>,
                fav('Lo-fi')
              )}

              {fxGroup(
                'Filters',
                activeFx.lowCut || activeFx.highCut ? 'on' : '',
                <>
                  <FilterCurve cut={activeFx} />
                  {freqSlider('Low cut', activeFx.lowCut, (v) => setActiveFx({ lowCut: v }), busy, 'min')}
                  {slopePicker('Low cut slope', activeFx.lowSlope, (v) => setActiveFx({ lowSlope: v }))}
                  {slide(
                    'Low cut resonance',
                    activeFx.lowRes,
                    activeFx.lowRes ? `+${activeFx.lowRes} dB` : 'Off',
                    (v) => setActiveFx({ lowRes: v }),
                    [0, 18, 0.5]
                  )}
                  {freqSlider('High cut', activeFx.highCut, (v) => setActiveFx({ highCut: v }), busy, 'max')}
                  {slopePicker('High cut slope', activeFx.highSlope, (v) => setActiveFx({ highSlope: v }))}
                  {slide(
                    'High cut resonance',
                    activeFx.highRes,
                    activeFx.highRes ? `+${activeFx.highRes} dB` : 'Off',
                    (v) => setActiveFx({ highRes: v }),
                    [0, 18, 0.5]
                  )}
                </>,
                fav('Filters')
              )}

              {fxGroup(
                'Equalizer',
                flatEq ? '' : 'on',
                <>
                  <EqCurve
                    eq={activeFx.eq}
                    eqFreq={activeFx.eqFreq}
                    eqQ={activeFx.eqQ}
                    onChange={setActiveFx}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Flat',
                    () => setActiveFx({ eq: NO_FX.eq, eqFreq: NO_FX.eqFreq, eqQ: NO_FX.eqQ }),
                    RotateCcw,
                    flatEq
                  )}
                </>,
                fav('Equalizer')
              )}

              {fxGroup(
                'Clipper',
                clipper.drive || clipper.ceiling < 0 ? 'on' : '',
                <>
                  {slide(
                    'Drive',
                    clipper.drive,
                    clipper.drive ? `+${clipper.drive} dB` : 'Off',
                    (v) => setFxPart('clipper', { drive: v }),
                    [0, 36, 0.5],
                    'Pushes the sound into the ceiling, where its peaks are cut flat: louder and harsher, the way gunshots are made to hit'
                  )}
                  {slide(
                    'Ceiling',
                    clipper.ceiling,
                    `${clipper.ceiling} dB`,
                    (v) => setFxPart('clipper', { ceiling: v }),
                    [-24, 0, 0.5],
                    'Nothing gets louder than this'
                  )}
                </>,
                fav('Clipper')
              )}

              {fxGroup(
                'Low pass gate',
                lpg.amount ? 'on' : '',
                <>
                  {percent(
                    'Amount',
                    lpg.amount,
                    (v) => setFxPart('lpg', { amount: v }),
                    'The loudest hit opens the gate; as the sound dies it turns darker and quieter',
                    'Off'
                  )}
                  {slide(
                    'Decay',
                    lpg.decay,
                    `${lpg.decay} ms`,
                    (v) => setFxPart('lpg', { decay: v }),
                    [10, 1000, 10],
                    'How slowly the gate closes after a hit'
                  )}
                  {freqSlider('Closes down to', lpg.floor, (v) => setFxPart('lpg', { floor: v }), busy, undefined, [20, 5000])}
                  {percent('Resonance', lpg.resonance, (v) => setFxPart('lpg', { resonance: v }))}
                </>,
                fav('Low pass gate')
              )}

              {fxGroup(
                'Flanger',
                flanger.mix ? 'on' : '',
                <>
                  {percent('Amount', flanger.mix, (v) => setFxPart('flanger', { mix: v }), undefined, 'Off')}
                  {slide(
                    'Delay',
                    flanger.time,
                    `${flanger.time} ms`,
                    (v) => setFxPart('flanger', { time: v }),
                    [0.1, 10, 0.1]
                  )}
                  {slide(
                    'Sweep depth',
                    flanger.depth,
                    flanger.depth ? `${flanger.depth} ms` : 'Fixed',
                    (v) => setFxPart('flanger', { depth: v }),
                    [0, 10, 0.1]
                  )}
                  {slide(
                    'Sweep rate',
                    flanger.rate,
                    `${flanger.rate} Hz`,
                    (v) => setFxPart('flanger', { rate: v }),
                    [0.05, 10, 0.05]
                  )}
                  {slide(
                    'Feedback',
                    Math.round(flanger.feedback * 100),
                    `${Math.round(flanger.feedback * 100)} %`,
                    (v) => setFxPart('flanger', { feedback: v / 100 }),
                    [-95, 95, 1],
                    'Higher rings more metallic; below zero sounds hollow'
                  )}
                </>,
                fav('Flanger')
              )}

              {fxGroup(
                'Delay',
                echo.mix ? 'on' : '',
                <>
                  {percent('Amount', echo.mix, (v) => setFxPart('delay', { mix: v }), undefined, 'Off')}
                  <SettingSlider
                    label="Time"
                    value={echo.time}
                    valueText={`${echo.time} ms`}
                    field={
                      <NumberField
                        label="Time in ms"
                        value={echo.time}
                        unit="ms"
                        min={10}
                        max={1000}
                        onCommit={(v) => setFxPart('delay', { time: v })}
                        disabled={busy}
                      />
                    }
                    onChange={(v) => setFxPart('delay', { time: v })}
                    min={10}
                    max={1000}
                    step={5}
                    disabled={busy}
                  />
                  {percent(
                    'Feedback',
                    echo.feedback,
                    (v) => setFxPart('delay', { feedback: Math.min(0.95, v) }),
                    'How much of every echo is repeated again'
                  )}
                  {percent('Damping', echo.damp, (v) => setFxPart('delay', { damp: v }), 'Every repeat gets darker')}
                </>,
                fav('Delay')
              )}

              {fxGroup(
                'Reverb',
                verb.mix ? 'on' : '',
                <>
                  <div role="group" aria-label="Reverb presets" className="flex flex-wrap gap-1">
                    {REVERB_PRESETS.map(({ name, set }) => (
                      <button
                        key={name}
                        type="button"
                        className={cn(chipButton, 'h-7 text-xs')}
                        onClick={() => setFxPart('reverb', { ...set, mix: verb.mix || 0.3 })}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  {percent(
                    'Amount',
                    verb.mix,
                    (v) => setFxPart('reverb', { mix: v }),
                    'The tail rings on past the last clip',
                    'Off'
                  )}
                  {slide(
                    'Decay',
                    verb.decay,
                    `${verb.decay.toFixed(1)} s`,
                    (v) => setFxPart('reverb', { decay: v }),
                    [0.1, 10, 0.1]
                  )}
                  {slide(
                    'Pre-delay',
                    verb.preDelay,
                    `${verb.preDelay} ms`,
                    (v) => setFxPart('reverb', { preDelay: v }),
                    [0, 250, 1],
                    'Silence before the room answers: longer sounds like walls further away'
                  )}
                  {slide(
                    'Size',
                    Math.round(verb.size * 100),
                    `${Math.round(verb.size * 100)} %`,
                    (v) => setFxPart('reverb', { size: v / 100 }),
                    [25, 200, 5],
                    'Spreads the reflections out in time'
                  )}
                  {percent(
                    'Reflections',
                    verb.early,
                    (v) => setFxPart('reverb', { early: v }),
                    'The first distinct echoes off the walls'
                  )}
                  {percent('Tail', verb.tail, (v) => setFxPart('reverb', { tail: v }), 'The smooth wash after them')}
                  {percent('Damping', verb.damping, (v) => setFxPart('reverb', { damping: Math.min(0.95, v) }), 'Highs die faster than lows')}
                  {percent(
                    'Diffusion',
                    verb.diffusion,
                    (v) => setFxPart('reverb', { diffusion: v }),
                    'Low leaves grainy single echoes, high smears them together'
                  )}
                  {freqSlider('Reverb low cut', verb.lowCut, (v) => setFxPart('reverb', { lowCut: v }), busy, 'min')}
                  {freqSlider('Reverb high cut', verb.highCut, (v) => setFxPart('reverb', { highCut: v }), busy, 'max')}
                  {percent(
                    'Stereo width',
                    verb.width,
                    (v) => setFxPart('reverb', { width: v }),
                    'Above 0 a mono track comes out stereo',
                    'Mono'
                  )}
                </>,
                fav('Reverb')
              )}

              {fxGroup(
                'Loop',
                hasSelection ? 'selection' : 'whole track',
                <>
                  {listSlider(
                    'Crossfade',
                    LOOP_FADES,
                    fx.loopMs,
                    (v) => setFx({ loopMs: v }),
                    (v) => `${v} ms`,
                    busy
                  )}
                  {actionBtn(
                    'Make seamless loop',
                    makeSeamless,
                    Repeat,
                    false,
                    'Find the end that matches the start best in phase and level, blend it into the start so it loops without a seam, then loop playback over it'
                  )}
                  {listSlider(
                    'Extend to',
                    EXTEND_LENS,
                    fx.extendLen,
                    (v) => setFx({ extendLen: v }),
                    (v) => `${v} s`,
                    busy
                  )}
                  {actionBtn(
                    'Extend by looping',
                    () => extendRange('loop'),
                    Repeat2,
                    false,
                    'Repeat its best loop in whole cycles until it is long enough. The real start and end stay. Best for sounds with a rhythm'
                  )}
                  {listSlider(
                    'Grain',
                    GRAIN_SIZES,
                    fx.grainMs,
                    (v) => setFx({ grainMs: v }),
                    (v) => `${v} ms`,
                    busy
                  )}
                  {actionBtn(
                    'Extend as texture',
                    () => extendRange('texture'),
                    Waves,
                    false,
                    'Rebuild it from pieces taken at random places, each matched in phase to the one before, so it never repeats. Best for steady sounds: hum, motors, fans, wind, rain'
                  )}
                </>,
                fav('Loop')
              )}

              {fxGroup(
                'Glue compressor',
                glueOn ? `on, -${reduction.toFixed(1)} dB` : 'on the mix',
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={glueOn}
                      onChange={(e) => setGlueOn(e.target.checked)}
                      className="h-4 w-4 accent-sky-400"
                    />
                    Glue the tracks together
                    {glueOn && (
                      <span
                        className="ml-auto font-mono text-[11px] tabular-nums text-amber-200"
                        title="Deepest gain reduction"
                      >
                        -{reduction.toFixed(1)} dB
                      </span>
                    )}
                  </label>
                  {glueOn && (
                    <>
                      <SettingSlider
                        label="Threshold"
                        value={glueSet.threshold}
                        valueText={`${glueSet.threshold} dB`}
                        onChange={(v) => setGlue({ threshold: v })}
                        min={-40}
                        max={0}
                        step={1}
                        disabled={busy}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className={sectionLabel}>Ratio</span>
                        <div role="group" aria-label="Ratio" className={segmentGroup}>
                          {GLUE_RATIOS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={glueSet.ratio === r}
                              onClick={() => setGlue({ ratio: r })}
                              className={segmentButton}
                            >
                              {r}:1
                            </button>
                          ))}
                        </div>
                      </div>
                      <SettingSlider
                        label="Attack"
                        value={GLUE_ATTACKS.indexOf(glueSet.attack)}
                        valueText={`${glueSet.attack} ms`}
                        onChange={(i) => setGlue({ attack: GLUE_ATTACKS[i] ?? glueSet.attack })}
                        min={0}
                        max={GLUE_ATTACKS.length - 1}
                        step={1}
                        disabled={busy}
                      />
                      <SettingSlider
                        label="Release"
                        value={GLUE_RELEASES.indexOf(glueSet.release)}
                        valueText={`${glueSet.release} ms`}
                        onChange={(i) => setGlue({ release: GLUE_RELEASES[i] ?? glueSet.release })}
                        min={0}
                        max={GLUE_RELEASES.length - 1}
                        step={1}
                        disabled={busy}
                      />
                      <SettingSlider
                        label="Makeup"
                        value={glueSet.makeup}
                        valueText={signed(glueSet.makeup, 'dB')}
                        onChange={(v) => setGlue({ makeup: v })}
                        min={0}
                        max={20}
                        step={1}
                        disabled={busy}
                      />
                      <SettingSlider
                        label="Dry / wet"
                        value={Math.round(glueSet.mix * 100)}
                        valueText={`${Math.round(glueSet.mix * 100)} %`}
                        onChange={(v) => setGlue({ mix: v / 100 })}
                        min={0}
                        max={100}
                        step={5}
                        disabled={busy}
                      />
                      {actionBtn('Reset', () => setGlueSet(GLUE_DEFAULT), RotateCcw)}
                    </>
                  )}
                </>,
                fav('Glue compressor')
              )}
              </div>
            </fieldset>
          </div>
        </div>
      )}
      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} label="Command palette">
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      </Modal>
      <Modal open={keysOpen} onClose={() => setKeysOpen(false)} label="Keyboard shortcuts">
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Keyboard and mouse</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([key, what]) => (
              <Fragment key={key}>
                <dt>
                  <kbd className={guideKey}>{key}</kbd>
                </dt>
                <dd className="text-slate-300">{what}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </Modal>
      {clipMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setClipMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setClipMenu(null);
            }}
          />
          <ul
            role="menu"
            aria-label="Clip"
            className="fixed z-50 w-48 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl"
            style={{
              left: Math.min(clipMenu.x, window.innerWidth - 200),
              top: Math.min(clipMenu.y, window.innerHeight - 260),
            }}
            onKeyDown={(e) => e.key === 'Escape' && setClipMenu(null)}
          >
            {clipActions(clipMenu.track, clipMenu.index).map(([label, run], i) => (
              <li key={label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus={i === 0}
                  disabled={busy}
                  onClick={() => {
                    setClipMenu(null);
                    actionLabel = `Clip: ${label}`;
                    try {
                      run();
                    } finally {
                      actionLabel = null;
                    }
                  }}
                  className={cn(
                    'w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-white/5 disabled:opacity-40',
                    label === 'Delete' ? 'text-rose-300' : 'text-slate-200'
                  )}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </ToolPageLayout>
  );
};

export default AudioEditor;
