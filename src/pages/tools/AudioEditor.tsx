import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  ChevronRight,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  Download,
  Eraser,
  Flag,
  FlipHorizontal2,
  Focus,
  Keyboard,
  Layers,
  LocateFixed,
  Magnet,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  RotateCcw,
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
import EqCurve from '@/components/tools/EqCurve';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { useHistory } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  audibleRange,
  clipEnd,
  computePeaks,
  copyRange,
  cutClips,
  deleteTrackRange,
  editTrackRange,
  encodeWav,
  fade,
  fadeCurve,
  fromAudioBuffer,
  fxActive,
  gain,
  glue,
  insertIntoTrack,
  keepRange,
  limit,
  loudness,
  makeLoop,
  moveClips,
  moveRange,
  NO_FX,
  noise,
  normalize,
  pasteClips,
  pitchShift,
  pcmDuration,
  pcmLength,
  processTrack,
  renderClips,
  resizeClip,
  reverse,
  silence,
  trackEnd,
  trackStart,
  tracksLength,
  type Clip,
  type Fade,
  type GlueSettings,
  type NoiseColor,
  type Pcm,
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
/** Hz; 0 = off */
const LOW_CUTS = [0, 30, 60, 100, 150, 200, 300, 500, 800, 1200, 2000];
const HIGH_CUTS = [500, 800, 1200, 2000, 3000, 5000, 8000, 12000, 16000, 0];
/** Hz; 0 = the project rate */
const CRUSH_RATES = [0, 22050, 16000, 11025, 8000, 6000, 4000, 2000];
const LOOP_FADES = [10, 20, 50, 100, 200, 500];
const LUFS_TARGETS = [-12, -14, -16, -18, -20, -23];
const NOISE_COLORS: NoiseColor[] = ['white', 'pink', 'brown'];
const FX_DEFAULT = {
  loopMs: 50,
  noiseColor: 'white' as NoiseColor,
  noiseLen: 0.5,
};
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
      onClick={onClick}
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
      onClick={onClick}
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

/** Collapsible panel section, one open at a time */
const fxGroup = (title: string, note: string, children: React.ReactNode) => (
  <details name="fx" className="group [&>summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2">
      <span className={cn(sectionLabel, 'mt-0 inline-flex items-center gap-1')}>
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {title}
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

/** One track's waveform. selStart/selEnd (seconds) highlight the selected part; equal when it isn't on this track. */
const LaneCanvas = ({
  clips,
  sampleRate,
  span,
  width,
  height,
  muted,
  selStart,
  selEnd,
}: {
  clips: Clip[];
  sampleRate: number;
  span: number;
  width: number;
  height: number;
  muted: boolean;
  selStart: number;
  selEnd: number;
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
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, Math.round(mid), width, 1); // zero line
    const selected = selEnd > selStart;
    bars(muted ? WAVE_MUTED : selected ? WAVE_DIM : WAVE);
    if (selected && !muted) {
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
  }, [drawn, width, height, span, muted, selStart, selEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
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
            'add lanes to layer sounds, solo or mute them, pan them left or right, and watch their level while playing. Export mixes what you hear.'
          )}
          {guideItem(
            'Effects:',
            'every track has its own live effect chain: volume, pan, pitch, punch, lo-fi, filters, EQ and reverb. Changes are heard right away and can be undone. Bake renders them into the audio.'
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
            'Clip fades:',
            'drag the small squares at the top corners of a clip to fade it in or out, and the dot to bend the curve. Double-click the dot to make it straight again.'
          )}
          {guideItem(
            'Glue compressor:',
            'evens out the mix of all tracks so layered sounds hit as one. It changes playback and export, and you can adjust it any time.'
          )}
          {guideItem(
            'Game SFX:',
            'shape transients, saturate, bitcrush, cut lows and highs, add a reverb tail, make seamless loops and generate noise bursts.'
          )}
          {guideItem(
            'Export:',
            'match loudness in LUFS with a limiter, and export up to 10 variations with random pitch and volume as a ZIP.'
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
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Project | null>(() => null, historyLimit);
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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 360 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);

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
        commit({ sampleRate: decoded.sampleRate, tracks: [track] });
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
    [commit]
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

  const play = (from?: number) => {
    if (!mix) return;
    stop();
    const ctx = getContext();
    void ctx.resume();
    const buffer = ctx.createBuffer(
      mix.channels.length,
      Math.max(1, pcmLength(mix)),
      mix.sampleRate
    );
    mix.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

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
    src.onended = () => {
      if (sourceRef.current === src) {
        sourceRef.current = null;
        setPlaying(false);
      }
    };
    sourceRef.current = src;
    setPlaying(true);

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
  }, [mix, loop, loopRegion]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const apply = (next: Track[], nextSelection: Selection = selection) => {
    if (!project) return;
    stop();
    commit({ ...project, tracks: next });
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

  /** Crossfades the end of the range into its start, closes the gap and loops playback over it */
  const makeSeamless = () => {
    if (!active) return;
    const [s, e] = range();
    const xf = Math.min(toSample(fx.loopMs / 1000), Math.floor((e - s) / 2));
    if (xf < 1) return;
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

  /** Noise on a new track at the cursor, with a fast curved fade-out: the base of whooshes, hits and explosions */
  const addNoise = () => {
    const pcm = noise(sampleRate, fx.noiseLen, fx.noiseColor);
    const n = pcmLength(pcm);
    const clip: Clip = {
      at: toSample(playhead),
      pcm,
      fadeIn: { length: Math.min(n, toSample(0.002)), curve: 0 },
      fadeOut: { length: Math.round(n * 0.9), curve: -0.6 },
    };
    const track = newTrack([clip]);
    apply([...tracks, track], { track: track.id, start: playhead, end: playhead + n / sampleRate });
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

  /** Moves (or copies) whole clips, fades and all, `lanes` tracks down and `shift` samples later; they stay picked */
  const moveGroup = (clips: Clip[], lanes: number, shift: number, copy: boolean) => {
    const { tracks: next, moved } = moveClips(tracks, clips, lanes, shift, copy);
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
      mapActive((t) => ({ id: t.id, clips: [{ at: s, pcm: keepRange(full, s, pcmLength(full)) }] }))
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
  const exportAudio = async () => {
    if (!mix) return;
    let source =
      selectionOnly && hasSelection
        ? keepRange(mix, toSample(selection.start), toSample(selection.end))
        : mix;
    const n = pcmLength(source);
    if (!n) {
      toast.info('Nothing to export');
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      if (matchLoudness) {
        const measured = loudness(source);
        if (Number.isFinite(measured)) source = limit(source, -1, targetLufs - measured);
      }
      const base = source;
      // Each take gets its own random pitch and volume, so a sound played often in a game doesn't repeat exactly
      const sources =
        takes > 1
          ? Array.from({ length: takes }, () => {
              const st = Math.round((Math.random() * 2 - 1) * varyPitch * 10) / 10;
              return pitchShift(
                gain(base, 0, n, 10 ** ((-Math.random() * varyVolume) / 20)),
                0,
                n,
                st
              );
            })
          : [base];
      let done = 0;
      const blobs =
        format === 'wav'
          ? sources.map(encodeWav)
          : await withFFmpeg(
              async (ff) => {
                const out: Blob[] = [];
                for (const [i, pcm] of sources.entries()) {
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
              (p) => setProgress((done + p) / sources.length)
            );
      let out = toFile(blobs[0], file?.name, format);
      if (blobs.length > 1) {
        const zip = new JSZip();
        blobs.forEach((blob, i) =>
          zip.file(toFile(blob, file?.name, format, String(i + 1)).name, blob)
        );
        out = toFile(await zip.generateAsync({ type: 'blob' }), file?.name, 'zip', 'variations');
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
      if (d.clips) moveGroup(d.clips, d.lanes, toSample(d.at) - toSample(d.start), copyDrop);
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
    const own = clip[fadeKey(d.edge)] ?? { length: 0, curve: 0 };
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
  const isTyping = (target: HTMLElement) =>
    Boolean(target.closest('textarea,select,[contenteditable="true"]')) ||
    (target instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'range', 'button'].includes(target.type));
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!project || isTyping(target)) return;
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
        ? exportSeconds * sampleRate * mixChannels * 2
        : lossy
          ? exportSeconds * kbps * 125
          : NaN) * takes;
  const flatEq = !activeFx.eq.low && !activeFx.eq.mid && !activeFx.eq.high;
  const setGlue = (patch: Partial<GlueSettings>) => setGlueSet((g) => ({ ...g, ...patch }));
  const setFx = (patch: Partial<typeof FX_DEFAULT>) => setFxState((f) => ({ ...f, ...patch }));
  const mixLufs = useMemo(
    () => (mix && matchLoudness ? loudness(mix) : null),
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
      keywords="audio editor, multitrack audio editor, sfx editor, game sound effects, transient shaper, bitcrusher, reverb, lufs normalization, cut mp3, trim audio, merge audio, combine mp3, audio equalizer, pitch shifter, audio converter, mp3 to wav, extract audio from video, normalize audio"
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
                  <SettingSlider
                    label="Length"
                    value={fx.noiseLen}
                    valueText={`${fx.noiseLen.toFixed(2)} s`}
                    onChange={(v) => setFx({ noiseLen: v })}
                    min={0.05}
                    max={3}
                    step={0.05}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Add noise burst',
                    addNoise,
                    Wind,
                    false,
                    'Noise with a fast fade-out: layer it under hits, or filter it into whooshes and explosions'
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
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={matchLoudness}
                    onChange={(e) => setMatchLoudness(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Match loudness
                  {mixLufs !== null && (
                    <span
                      className="ml-auto font-mono text-[11px] tabular-nums text-slate-400"
                      title="Loudness of the whole mix now"
                    >
                      {Number.isFinite(mixLufs) ? `now ${mixLufs.toFixed(1)} LUFS` : 'silent'}
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
                      peaks under -1 dB.
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
                                Track {i + 1}
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
                    <div className="flex items-center px-1" style={{ height: ADD_ROW_H }}>
                      <button
                        type="button"
                        onClick={addTrack}
                        disabled={busy}
                        className={cn(chipButton, 'h-7 w-full justify-center text-xs')}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add track
                      </button>
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
                  <p className="text-sm text-slate-200">
                    Track {tracks.indexOf(active) + 1}{' '}
                    <span className="text-slate-500">· live effects</span>
                  </p>
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
                </>
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
                </>
              )}

              {fxGroup(
                'Filters',
                activeFx.lowCut || activeFx.highCut ? 'on' : '24 dB/oct',
                <>
                  {listSlider(
                    'Low cut',
                    LOW_CUTS,
                    activeFx.lowCut,
                    (v) => setActiveFx({ lowCut: v }),
                    (v) => (v ? hz(v) : 'Off'),
                    busy
                  )}
                  {listSlider(
                    'High cut',
                    HIGH_CUTS,
                    activeFx.highCut,
                    (v) => setActiveFx({ highCut: v }),
                    (v) => (v ? hz(v) : 'Off'),
                    busy
                  )}
                </>
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
                </>
              )}

              {fxGroup(
                'Reverb',
                activeFx.reverb ? 'on' : '',
                <>
                  <SettingSlider
                    label="Amount"
                    value={Math.round(activeFx.reverb * 100)}
                    valueText={activeFx.reverb ? `${Math.round(activeFx.reverb * 100)} %` : 'Off'}
                    onChange={(v) => setActiveFx({ reverb: v / 100 })}
                    min={0}
                    max={100}
                    step={5}
                    disabled={busy}
                    hint="The tail rings on past the last clip"
                  />
                  <SettingSlider
                    label="Decay"
                    value={activeFx.decay}
                    valueText={`${activeFx.decay.toFixed(1)} s`}
                    onChange={(v) => setActiveFx({ decay: v })}
                    min={0.2}
                    max={5}
                    step={0.1}
                    disabled={busy}
                  />
                </>
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
                    'Blend the end into the start so it loops without a click, then loop playback over it'
                  )}
                </>
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
                </>
              )}
            </fieldset>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
};

export default AudioEditor;
