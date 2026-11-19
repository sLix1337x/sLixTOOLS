import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  ChevronRight,
  Cpu,
  Crop,
  Download,
  Eraser,
  Filter,
  FlipHorizontal2,
  Gauge,
  Keyboard,
  Layers,
  Maximize2,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  RotateCcw,
  Scissors,
  Shrink,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Undo2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SettingSlider from '@/components/tools/SettingSlider';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Progress } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { useHistory } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  audibleRange,
  bitcrush,
  clipEnd,
  computePeaks,
  cutClips,
  cutFilter,
  deleteTrackRange,
  editTrackRange,
  encodeWav,
  equalize,
  fade,
  fadeCurve,
  fromAudioBuffer,
  gain,
  glue,
  insertIntoTrack,
  keepRange,
  limit,
  loudness,
  makeLoop,
  moveRange,
  noise,
  normalize,
  pitchShift,
  pcmDuration,
  pcmLength,
  renderClips,
  reverb,
  reverse,
  saturate,
  silence,
  trackEnd,
  trackStart,
  tracksLength,
  transient,
  type Clip,
  type EqGains,
  type Fade,
  type GlueSettings,
  type NoiseColor,
  type Pcm,
  type Track,
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
  settingsColumn,
  settingsGrid,
  statusRow,
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
const EQ_BANDS = [
  ['low', 'Bass', '200 Hz'],
  ['mid', 'Mids', '1 kHz'],
  ['high', 'Treble', '4 kHz'],
] as const;
const FLAT_EQ: EqGains = { low: 0, mid: 0, high: 0 };
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
  attack: 6,
  sustain: 0,
  drive: 6,
  bits: 8,
  rate: 11025,
  lowCut: 100,
  highCut: 0,
  decay: 1,
  amount: 30,
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
}
type FadeEdge = 'in' | 'out';
type FadeDrag = {
  mode: 'fade';
  track: number;
  clip: number;
  edge: FadeEdge;
  part: 'length' | 'curve';
};
type Drag = { mode: 'select'; anchor: number } | { mode: 'move'; grab: number; x: number; y: number; moved: boolean } | FadeDrag;

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
const historyLimitFor = (bytes: number) => Math.max(3, Math.min(30, Math.floor(MEMORY_BUDGET / bytes)));
const signed = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v} ${unit}`;

const iconBtn = (label: string, onClick: () => void, Icon: typeof Play, opts: { disabled?: boolean; shortcut?: string; pressed?: boolean } = {}) => (
  <Tooltip label={label} shortcut={opts.shortcut}>
    <button type="button" aria-label={label} aria-pressed={opts.pressed} disabled={opts.disabled} onClick={onClick} className={toolButton}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  </Tooltip>
);

const actionBtn = (label: string, onClick: () => void, Icon: typeof Play, disabled = false, hint?: string) => {
  const button = (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(chipButton, 'w-full justify-start')}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
  return hint ? <Tooltip label={hint}>{button}</Tooltip> : button;
};

/** Slider over a fixed list of values */
const listSlider = (label: string, list: number[], value: number, onChange: (v: number) => void, text: (v: number) => string, disabled: boolean) => (
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

/** Collapsible panel section */
const fxGroup = (title: string, note: string, children: React.ReactNode) => (
  <details className="group [&>summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2">
      <span className={cn(sectionLabel, 'mt-0 inline-flex items-center gap-1')}>
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        {title}
      </span>
      <span className="text-[11px] text-slate-500">{note}</span>
    </summary>
    <div className="space-y-2 pt-2">{children}</div>
  </details>
);

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
        const w = Math.max(1, Math.round(px(pcmLength(c.pcm))));
        return {
          x: Math.round(px(c.at)),
          w,
          peaks: peaksOf(c.pcm, w),
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
      for (const { x, w, peaks } of drawn) {
        for (let i = 0; i < w; i++) ctx.fillRect(x + i, mid - peaks[i * 2 + 1] * amp, 1, Math.max(1, (peaks[i * 2 + 1] - peaks[i * 2]) * amp));
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
      if (fadeOut) shade(x + w - px(fadeOut.length), px(fadeOut.length), (u) => fadeCurve(1 - u, fadeOut.curve));
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
          {guideItem('Select:', 'drag across a track, then drag the handles to adjust. Shift+click extends, double-click selects a whole clip.')}
          {guideItem('Move:', 'drag a selection to slide it in time or drop it onto another track.')}
          {guideItem('Trim / Delete:', 'keep only the selected time, or cut the selection out of its track.')}
          {guideItem('From video:', 'drop a video to edit or extract its soundtrack.')}
          {guideItem('Drop files:', 'drag sounds from your desktop onto any track, or below the last track for a new one. They land where you drop them.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Layers className="h-5 w-5" aria-hidden="true" />
          Tracks and Effects
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Tracks:', 'add lanes to layer sounds, mute one to hear the rest. Export mixes all unmuted tracks.')}
          {guideItem('Effects:', 'apply to the selection, or to the whole track when nothing is selected.')}
          {guideItem('Equalizer:', 'raise or cut bass, mids and treble by up to 12 dB.')}
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
          {guideItem('Export:', 'match loudness in LUFS with a limiter, and export up to 10 variations with random pitch and volume as a ZIP.')}
          {guideItem('Formats:', 'MP3, WAV, OGG, FLAC and M4A, so this doubles as an audio converter.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Shortcuts
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li>
            <kbd className={guideKey}>Space</kbd> play / pause, <kbd className={guideKey}>Home</kbd> / <kbd className={guideKey}>End</kbd> jump
          </li>
          <li>
            <kbd className={guideKey}>Ctrl</kbd> + mouse wheel zoom, <kbd className={guideKey}>Shift</kbd> + wheel scrolls sideways
          </li>
          <li>
            <kbd className={guideKey}>Del</kbd> delete selection, <kbd className={guideKey}>Esc</kbd> clear it
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+A</kbd> select the whole track
          </li>
          <li>
            <kbd className={guideKey}>Ctrl+Z</kbd> / <kbd className={guideKey}>Ctrl+Y</kbd> undo / redo
          </li>
        </ul>
      </section>
    </div>
  </div>
);

const AudioEditor = () => {
  const [historyLimit, setHistoryLimit] = useState(30);
  const { present: project, commit, undo, redo, canUndo, canRedo } = useHistory<Project | null>(() => null, historyLimit);
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection>({ track: 0, start: 0, end: 0 });
  const [muted, setMuted] = useState<number[]>([]);
  const [move, setMove] = useState<{ track: number; at: number } | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gainDb, setGainDb] = useState(3);
  const [semitones, setSemitones] = useState(2);
  const [eq, setEq] = useState<EqGains>(FLAT_EQ);
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

  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const insertInputRef = useRef<HTMLInputElement>(null);
  const insertModeRef = useRef<'cursor' | 'end' | 'track'>('cursor');
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const sampleRate = project?.sampleRate ?? 1;
  const tracks = project?.tracks ?? [];
  const duration = tracksLength(tracks) / sampleRate;
  /** Seconds the timeline shows: a bit past the end so parts can be dragged there */
  const span = Math.max(1, duration * 1.1);
  const active = tracks.find((t) => t.id === selection.track) ?? tracks[0];
  const hasSelection = selection.end - selection.start > 0.001;
  const toSample = (t: number) => Math.round(t * sampleRate);
  // Effects work on the selection, or on the whole active track when nothing is selected
  const range = (): [number, number] =>
    hasSelection ? [toSample(selection.start), toSample(selection.end)] : active ? [trackStart(active), trackEnd(active)] : [0, 0];
  const scope = hasSelection ? 'on the selection' : 'on the whole track';

  // What plays and exports: every unmuted track summed, through the glue compressor when it's on
  const { mix, reduction } = useMemo(() => {
    if (!project) return { mix: null, reduction: 0 };
    const sum = renderClips(
      project.tracks.filter((t) => !muted.includes(t.id)).flatMap((t) => t.clips),
      project.sampleRate,
      0,
      tracksLength(project.tracks)
    );
    if (!glueOn) return { mix: sum, reduction: 0 };
    const glued = glue(sum, glueSet);
    return { mix: glued.pcm, reduction: glued.reduction };
  }, [project, muted, glueOn, glueSet]);

  // ---- loading ----
  const load = useCallback(
    async (next: File) => {
      setBusy(true);
      try {
        const decoded = await decode(next);
        if (pcmBytes(decoded) > MEMORY_BUDGET / 2) throw new Error('This file is too long to edit in the browser');
        setHistoryLimit(historyLimitFor(pcmBytes(decoded)));
        stop();
        const track = newTrack([{ at: 0, pcm: decoded }]);
        commit({ sampleRate: decoded.sampleRate, tracks: [track] });
        setFile(next);
        setMuted([]);
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
    const buffer = ctx.createBuffer(mix.channels.length, Math.max(1, pcmLength(mix)), mix.sampleRate);
    mix.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const loopSel = loop && hasSelection;
    const start = from ?? (hasSelection && (playhead < selection.start || playhead >= selection.end) ? selection.start : playhead >= duration ? 0 : playhead);
    if (loopSel) {
      src.loop = true;
      src.loopStart = selection.start;
      src.loopEnd = selection.end;
    }
    // Without loop a selection plays to its end; a cursor plays to the end of the project
    const until = hasSelection && start < selection.end ? selection.end : duration;
    src.start(0, start, loopSel ? undefined : Math.max(0, until - start));
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
      if (loopSel && t > selection.end) t = selection.start + ((t - selection.start) % (selection.end - selection.start));
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
  // Muting or the compressor changes the mix: keep playing from the same spot with the new one
  useEffect(() => {
    if (sourceRef.current) play(playhead);
  }, [mix]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast.success(`Trimmed ${formatTimecode((pcmLength(mix) - (e - s)) / sampleRate)} of silence`);
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

  const moveSelection = (to: number, at: number) => {
    const len = selection.end - selection.start;
    apply(moveRange(tracks, selection.track, toSample(selection.start), toSample(selection.end), to, toSample(at)), {
      track: to,
      start: at,
      end: at + len,
    });
  };

  const addTrack = () => {
    const track = newTrack();
    apply([...tracks, track], { track: track.id, start: playhead, end: playhead });
  };

  const removeTrack = (id: number) => {
    const rest = tracks.filter((t) => t.id !== id);
    apply(rest, { track: rest[0].id, start: playhead, end: playhead });
  };

  const toggleMute = (id: number) => setMuted((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const insertSilence = () => {
    if (!active) return;
    const at = selection.start;
    apply(
      mapActive((t) => insertIntoTrack(t, toSample(at), { sampleRate, channels: [new Float32Array(sampleRate)] })),
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
      const next = created ? [...tracks, created] : mapActive((t) => insertIntoTrack(t, toSample(at), decoded));
      setHistoryLimit(historyLimitFor(next.flatMap((t) => t.clips).reduce((n, c) => n + pcmBytes(c.pcm), 0)));
      apply(next, { track: created?.id ?? active.id, start: at, end: at + pcmDuration(decoded) });
      toast.success(`${other.name} ${created ? 'added on a new track' : mode === 'end' ? 'appended' : 'inserted'}`);
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
      const next = created ? [...tracks, created] : tracks.map((t) => (t.id === target.track ? { ...t, clips: [...t.clips, ...clips] } : t));
      setHistoryLimit(historyLimitFor(next.flatMap((t) => t.clips).reduce((n, c) => n + pcmBytes(c.pcm), 0)));
      const id = created?.id ?? (target.track as number);
      apply(next, { track: id, start: target.at, end: at / sampleRate });
      const what = clips.length === 1 ? files.find((f) => !skipped.includes(f.name))?.name : `${clips.length} files`;
      toast.success(`${what} added ${created ? 'on a new track' : `to track ${tracks.findIndex((t) => t.id === id) + 1}`}`);
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
    let source = selectionOnly && hasSelection ? keepRange(mix, toSample(selection.start), toSample(selection.end)) : mix;
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
              return pitchShift(gain(base, 0, n, 10 ** ((-Math.random() * varyVolume) / 20)), 0, n, st);
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
                  await ff.run(['-i', `in${i}.wav`, ...audioCodecArgs(format, kbps), `out${i}.${format}`], pcmDuration(pcm));
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
        blobs.forEach((blob, i) => zip.file(toFile(blob, file?.name, format, String(i + 1)).name, blob));
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
  const laneHeight = Math.max(MIN_LANE_H, Math.floor((viewSize.height - RULER_H - ADD_ROW_H) / Math.max(1, tracks.length)));

  const tickStep = RULER_STEPS.find((s) => (s / span) * canvasWidth >= MIN_TICK_PX) ?? RULER_STEPS[RULER_STEPS.length - 1];
  const ticks = Array.from({ length: Math.floor(span / tickStep + 1e-6) + 1 }, (_, i) => Math.round(i * tickStep * 10) / 10);
  const tickLabel = (t: number) => (tickStep >= 1 ? formatTimecode(t).replace(/\.\d$/, '') : formatTimecode(t));

  // Keep the playhead in view while zoomed in and playing
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !playing || zoom === 1) return;
    const x = (playhead / span) * canvasWidth;
    if (x < view.scrollLeft || x > view.scrollLeft + view.clientWidth - 20) view.scrollLeft = x - 20;
  }, [playhead, playing, zoom, span, canvasWidth]);

  const timeAt = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(span, ((clientX - rect.left) / rect.width) * span));
  };

  const laneAt = (clientY: number) => {
    const top = lanesRef.current?.getBoundingClientRect().top ?? 0;
    return tracks[Math.max(0, Math.min(tracks.length - 1, Math.floor((clientY - top) / laneHeight)))]?.id ?? 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!project || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeAt(e.clientX);
    const track = laneAt(e.clientY);
    // Grabbing inside the selection moves that part
    if (!e.shiftKey && hasSelection && track === selection.track && t > selection.start && t < selection.end) {
      dragRef.current = {
        mode: 'move',
        grab: t - selection.start,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
      return;
    }
    const extend = e.shiftKey && track === selection.track;
    const anchor = extend ? (Math.abs(t - selection.start) < Math.abs(t - selection.end) ? selection.end : selection.start) : t;
    dragRef.current = { mode: 'select', anchor };
    setSelection({ track, start: Math.min(anchor, t), end: Math.max(anchor, t) });
    if (!extend) seek(t);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = timeAt(e.clientX);
    setHoverTime(t);
    const d = dragRef.current;
    if (d?.mode === 'select') setSelection((s) => ({ ...s, start: Math.min(d.anchor, t), end: Math.max(d.anchor, t) }));
    else if (d?.mode === 'move') {
      d.moved ||= Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4;
      if (d.moved) setMove({ track: laneAt(e.clientY), at: Math.max(0, t - d.grab) });
    } else if (d?.mode === 'fade') {
      const fade = fadeAt(d, e);
      if (fade) setFadeDraft({ track: d.track, clip: d.clip, edge: d.edge, fade });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    onPointerMove(e); // fast drags can release past the last move event
    const d = dragRef.current;
    dragRef.current = null;
    setMove(null);
    if (d?.mode === 'fade') {
      setFadeDraft(null);
      const fade = fadeAt(d, e);
      const old = tracks.find((t) => t.id === d.track)?.clips[d.clip]?.[fadeKey(d.edge)];
      if (fade && (fade.length !== (old?.length ?? 0) || fade.curve !== (old?.curve ?? 0))) setFade(d.track, d.clip, d.edge, fade);
      return;
    }
    if (d?.mode !== 'move') return;
    const t = timeAt(e.clientX);
    if (d.moved) moveSelection(laneAt(e.clientY), Math.max(0, t - d.grab));
    else {
      // A click inside the selection just places the cursor
      setSelection({ ...selection, start: t, end: t });
      seek(t);
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const track = tracks.find((t) => t.id === laneAt(e.clientY));
    const s = toSample(timeAt(e.clientX));
    const clip = track?.clips.find((c) => c.at <= s && s < clipEnd(c));
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
  const onFadeDown = (e: React.PointerEvent, track: number, clip: number, edge: FadeEdge, part: FadeDrag['part']) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    lanesRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: 'fade', track, clip, edge, part };
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
  const setFade = (track: number, clip: number, edge: FadeEdge, fade: Fade) => apply(tracks.map((t) => (t.id === track ? withFade(t, clip, edge, fade) : t)));

  /** Zooms keeping focus (seconds) at anchor px from the view's left edge; defaults to centering the selection or cursor */
  const zoomTo = (next: number, focus = hasSelection ? (selection.start + selection.end) / 2 : playhead, anchor?: number) => {
    const view = viewRef.current;
    const z = Math.max(1, Math.min(MAX_ZOOM, next));
    setZoom(z);
    requestAnimationFrame(() => {
      if (view) view.scrollLeft = (focus / span) * view.scrollWidth - (anchor ?? view.clientWidth / 2);
    });
  };

  // Ctrl/Cmd + wheel zooms around the pointer; a plain wheel scrolls sideways while zoomed in, unless the lanes need it to scroll down.
  // Native listener: React's wheel handler is passive and cannot preventDefault.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const view = viewRef.current;
    if (!view) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const x = e.clientX - view.getBoundingClientRect().left;
      zoomTo(zoom * (e.deltaY < 0 ? 1.25 : 0.8), ((view.scrollLeft + x) / view.scrollWidth) * span, x);
    } else if (zoom > 1 && view.scrollHeight <= view.clientHeight && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      view.scrollLeft += e.deltaY;
    }
  };
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const onWheel = (e: WheelEvent) => wheelRef.current(e);
    view.addEventListener('wheel', onWheel, { passive: false });
    return () => view.removeEventListener('wheel', onWheel);
  }, [project !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomToSelection = () => {
    if (!requireSelection()) return;
    zoomTo(span / (selection.end - selection.start));
  };

  // ---- keyboard ----
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!project || busy || target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === 'y' || (key === 'z' && e.shiftKey)) redo();
      else if (key === 'z') undo();
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
    if (e.code === 'Space' && !target.closest('button')) {
      e.preventDefault();
      togglePlay();
    } else if (key === 'delete' || key === 'backspace') deleteSelection();
    else if (key === 'escape') setSelection((s) => ({ ...s, start: playhead, end: playhead }));
    else if (key === 'home') seek(0);
    else if (key === 'end') seek(duration);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pct = (t: number) => `${(t / span) * 100}%`;
  const lossy = LOSSY.includes(format);
  const exportSeconds = selectionOnly && hasSelection ? selection.end - selection.start : duration;
  const mixChannels = mix?.channels.length ?? 1;
  // FLAC depends on the content, so no estimate
  const estimate = !mix ? null : (format === 'wav' ? exportSeconds * sampleRate * mixChannels * 2 : lossy ? exportSeconds * kbps * 125 : NaN) * takes;
  const flatEq = eq.low === 0 && eq.mid === 0 && eq.high === 0;
  const setGlue = (patch: Partial<GlueSettings>) => setGlueSet((g) => ({ ...g, ...patch }));
  const setFx = (patch: Partial<typeof FX_DEFAULT>) => setFxState((f) => ({ ...f, ...patch }));
  const mixLufs = useMemo(() => (mix && matchLoudness ? loudness(mix) : null), [mix, matchLoudness]);

  // ---- dropping files from the desktop ----
  const dropTarget = (e: React.DragEvent) => {
    const row = Math.floor((e.clientY - (lanesRef.current?.getBoundingClientRect().top ?? 0)) / laneHeight);
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
    setDropAt((d) => (d && d.track === next.track && Math.abs(d.at - next.at) < span / 2000 ? d : next));
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
          answer: 'Anything your browser can decode: MP3, WAV, OGG, FLAC, M4A/AAC, Opus and the soundtrack of most MP4 and WebM videos.',
        },
        {
          question: 'Can I layer several sounds?',
          answer: 'Yes. Add audio on a new track, or add an empty track and drag parts onto it. The export mixes every unmuted track into one file.',
        },
        {
          question: 'Can I use it as an audio converter?',
          answer: 'Yes. Open a file and export it in another format without editing anything.',
        },
        {
          question: 'Does editing lose quality?',
          answer: 'Edits run on the uncompressed audio. Only the final export to MP3, OGG or M4A compresses again; WAV and FLAC are lossless.',
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
            <li>Glue compressor</li>
            <li>Pitch, normalize &amp; reverse</li>
            <li>Export MP3, WAV, OGG, FLAC, M4A</li>
          </ul>
        </div>
      ) : (
        <div className={editorWorkspace}>
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
            <SourceChip icon={AudioWaveform} name={file.name} meta={formatFileSize(file.size)} onRemove={clear} disabled={busy} />
            <ToolbarDivider />
            <div className="flex items-center gap-1">
              {iconBtn('Undo', undo, Undo2, { disabled: !canUndo || busy, shortcut: 'Ctrl+Z' })}
              {iconBtn('Redo', redo, Redo2, { disabled: !canRedo || busy, shortcut: 'Ctrl+Y' })}
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <button type="button" onClick={() => void exportAudio()} disabled={busy} className={primaryButton}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {progress !== null ? 'Exporting...' : takes > 1 ? `Export ${takes} × ${format.toUpperCase()}` : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className={settingsGrid}>
            <div className="flex min-h-[22rem] min-w-0 flex-col lg:min-h-0">
              <div className="relative min-h-0 flex-1 bg-black/30">
                <div
                  ref={viewRef}
                  className="h-full overflow-auto"
                  onDragOver={onDragOver}
                  onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropAt(null)}
                  onDrop={onDrop}
                >
                  <div ref={contentRef} className="relative" style={{ width: canvasWidth }}>
                    {/* Ruler: click to move the cursor */}
                    <div
                      className="sticky top-0 z-30 cursor-pointer select-none overflow-hidden border-b border-white/10 bg-slate-950"
                      style={{ height: RULER_H }}
                      onPointerDown={(e) => e.button === 0 && seek(timeAt(e.clientX))}
                      aria-hidden="true"
                    >
                      {ticks.map((t) => (
                        <div key={t} className="absolute inset-y-0" style={{ left: pct(t) }}>
                          <span className="absolute left-1 top-1 whitespace-nowrap font-mono text-[10px] text-slate-500">{tickLabel(t)}</span>
                          <span className="absolute bottom-0 left-0 h-2 w-px bg-white/25" />
                        </div>
                      ))}
                      <div className="absolute bottom-0 h-3 w-0.5 -translate-x-1/2 bg-amber-300" style={{ left: pct(playhead) }} />
                    </div>

                    <div
                      ref={lanesRef}
                      className={cn('relative touch-none select-none', move ? 'cursor-grabbing' : 'cursor-text')}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={() => {
                        dragRef.current = null;
                        setMove(null);
                        setFadeDraft(null);
                      }}
                      onPointerLeave={() => setHoverTime(null)}
                      onDoubleClick={onDoubleClick}
                      role="group"
                      aria-label="Tracks: click to place the cursor, drag to select, drag a selection to move it"
                    >
                      {tracks.map((track, i) => {
                        const isMuted = muted.includes(track.id);
                        const selected = hasSelection && track.id === selection.track;
                        const shown = fadeDraft?.track === track.id ? withFade(track, fadeDraft.clip, fadeDraft.edge, fadeDraft.fade).clips : track.clips;
                        return (
                          <div
                            key={track.id}
                            className={cn('relative border-b border-white/10', track === active && tracks.length > 1 && 'bg-white/[0.03]')}
                            style={{ height: laneHeight }}
                          >
                            <LaneCanvas
                              clips={shown}
                              sampleRate={sampleRate}
                              span={span}
                              width={canvasWidth}
                              height={laneHeight}
                              muted={isMuted}
                              selStart={selected ? selection.start : 0}
                              selEnd={selected ? selection.end : 0}
                            />
                            {/* Track header stays at the left edge while scrolling */}
                            <div
                              className="sticky left-0 z-20 flex w-fit cursor-default items-center gap-0.5 px-1 pb-1 pt-3.5"
                              onPointerDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                            >
                              <span className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-slate-300">Track {i + 1}</span>
                              <Tooltip label={isMuted ? 'Unmute track' : 'Mute track'}>
                                <button
                                  type="button"
                                  aria-label={isMuted ? `Unmute track ${i + 1}` : `Mute track ${i + 1}`}
                                  aria-pressed={isMuted}
                                  onClick={() => toggleMute(track.id)}
                                  className={cn(
                                    'inline-flex h-6 w-6 items-center justify-center rounded bg-black/60 hover:bg-white/15',
                                    isMuted ? 'text-amber-300' : 'text-slate-300'
                                  )}
                                >
                                  {isMuted ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                </button>
                              </Tooltip>
                              {tracks.length > 1 && (
                                <Tooltip label="Remove track">
                                  <button
                                    type="button"
                                    aria-label={`Remove track ${i + 1}`}
                                    disabled={busy}
                                    onClick={() => removeTrack(track.id)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/60 text-slate-300 hover:bg-white/15"
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                            {selected && (
                              <>
                                <div
                                  className={cn('absolute inset-y-0 bg-sky-400/10 ring-1 ring-inset ring-sky-300/60', move ? 'opacity-40' : 'cursor-grab')}
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
                            {move?.track === track.id && (
                              <div
                                className="pointer-events-none absolute inset-y-1 rounded border-2 border-dashed border-sky-300 bg-sky-400/20"
                                style={{
                                  left: pct(move.at),
                                  width: pct(selection.end - selection.start),
                                }}
                              />
                            )}
                            {shown.flatMap((clip, ci) =>
                              (['in', 'out'] as const).flatMap((edge) => {
                                const f = clip[fadeKey(edge)];
                                const len = f?.length ?? 0;
                                const at = (edge === 'in' ? clip.at + len : clipEnd(clip) - len) / sampleRate;
                                const mid = (edge === 'in' ? clip.at + len / 2 : clipEnd(clip) - len / 2) / sampleRate;
                                const name = edge === 'in' ? 'Fade in' : 'Fade out';
                                const dragging = fadeDraft?.track === track.id && fadeDraft.clip === ci && fadeDraft.edge === edge;
                                const handle = 'absolute z-30 h-3 w-3 border border-amber-300 bg-slate-950/80 hover:bg-amber-300';
                                return [
                                  <div
                                    key={`${ci}${edge}`}
                                    title={`${name}: drag sideways`}
                                    className={cn(handle, 'top-0 cursor-ew-resize rounded-sm', edge === 'out' && '-translate-x-full')}
                                    style={{ left: pct(at) }}
                                    onPointerDown={(e) => onFadeDown(e, track.id, ci, edge, 'length')}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                  />,
                                  f && len > 0 && (
                                    <div
                                      key={`${ci}${edge}c`}
                                      title={`${name} curve: drag up or down, double-click to straighten`}
                                      className={cn(handle, '-translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full')}
                                      style={{
                                        left: pct(mid),
                                        top: `${(1 - fadeCurve(0.5, f.curve)) * 100}%`,
                                      }}
                                      onPointerDown={(e) => onFadeDown(e, track.id, ci, edge, 'curve')}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if (f.curve) setFade(track.id, ci, edge, { ...f, curve: 0 });
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
                                      {f?.curve ? ` · curve ${signed(Math.round(f.curve * 100), '%')}` : ''}
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
                            top: (dropAt.track === null ? tracks.length : tracks.findIndex((t) => t.id === dropAt.track)) * laneHeight,
                            height: dropAt.track === null ? ADD_ROW_H : laneHeight,
                          }}
                        >
                          <div className="absolute inset-y-0 w-0.5 bg-emerald-300" style={{ left: pct(dropAt.at) }}>
                            <span className="absolute left-1.5 top-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-emerald-200">
                              {dropAt.track === null ? 'New track' : `Track ${tracks.findIndex((t) => t.id === dropAt.track) + 1}`} at{' '}
                              {formatTimecode(dropAt.at)}
                            </span>
                          </div>
                        </div>
                      )}
                      {hoverTime !== null && (
                        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/30" style={{ left: pct(hoverTime) }}>
                          <span className="absolute left-1 top-1 rounded bg-black/70 px-1 font-mono text-[10px] text-slate-200">
                            {formatTimecode(move ? move.at : hoverTime)}
                          </span>
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
                        style={{ left: pct(playhead) }}
                      />
                    </div>

                    <div className="sticky left-0 flex w-fit items-center p-1.5" style={{ height: ADD_ROW_H }}>
                      <button type="button" onClick={addTrack} disabled={busy} className={cn(chipButton, 'h-7 text-xs')}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add track
                      </button>
                    </div>
                  </div>
                </div>
                <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-xs text-slate-300">
                  {hasSelection ? 'Drag the selection to move it, also onto another track' : 'Drag across a track to select, double-click selects a clip'}
                </p>
              </div>

              {/* Transport */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-3 py-2">
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
                  {iconBtn('Loop selection', () => setLoop((l) => !l), Repeat, { pressed: loop })}
                </div>
                <div className="font-mono tabular-nums" aria-label="Cursor position">
                  <span className="text-lg text-white">{formatTimecode(playhead)}</span>
                  <span className="text-sm text-slate-500"> / {formatTimecode(duration)}</span>
                </div>
                {hasSelection && (
                  <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-400/10 pl-3 pr-1 font-mono text-xs tabular-nums text-sky-200">
                    <span>
                      <span className="font-sans text-sky-300/80">Selection</span> {formatTimecode(selection.start)} – {formatTimecode(selection.end)} (
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
                  {iconBtn('Zoom to selection', zoomToSelection, Maximize2, {
                    disabled: !hasSelection,
                  })}
                  {iconBtn('Show everything', () => zoomTo(1), Shrink, { disabled: zoom <= 1 })}
                </div>
              </div>
            </div>

            <fieldset disabled={busy} className={cn(settingsColumn, 'min-w-0')}>
              <section className="space-y-2">
                <p className={cn(sectionLabel, 'mt-0')}>Cut</p>
                <div className="grid grid-cols-2 gap-2">
                  {actionBtn('Trim', trimToSelection, Crop, !hasSelection, 'Keep only the selected time, on every track')}
                  {actionBtn('Delete', deleteSelection, Scissors, !hasSelection, 'Cut the selection out of its track (Del)')}
                  {actionBtn('Silence', () => requireSelection() && effect(silence), VolumeX, !hasSelection, 'Mute the selection')}
                  {actionBtn('Trim silence', trimSilence, Eraser, false, 'Cut the silence before the first and after the last sound of the mix')}
                </div>
                {!hasSelection && <p className="text-xs text-slate-500">Drag across a track to trim, delete or silence a part.</p>}
              </section>

              <section className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Effects</p>
                  <span className="text-[11px] text-slate-500">{scope}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {actionBtn('Fade in', () => effect((p, s, e) => fade(p, s, e, 'in')), TrendingUp)}
                  {actionBtn('Fade out', () => effect((p, s, e) => fade(p, s, e, 'out')), TrendingDown)}
                  {actionBtn('Normalize', () => effect((p, s, e) => normalize(p, s, e)), Maximize2, false, 'Raise the volume until the loudest peak just fits')}
                  {actionBtn('Reverse', () => effect(reverse), FlipHorizontal2)}
                </div>
                <div className="flex items-end gap-2 pt-1">
                  <div className="min-w-0 flex-1">
                    <SettingSlider
                      label="Volume"
                      value={gainDb}
                      valueText={signed(gainDb, 'dB')}
                      onChange={setGainDb}
                      min={-20}
                      max={20}
                      step={1}
                      disabled={busy}
                    />
                  </div>
                  <button type="button" className={chipButton} disabled={gainDb === 0} onClick={() => effect((p, s, e) => gain(p, s, e, 10 ** (gainDb / 20)))}>
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Apply
                  </button>
                </div>
                <div className="flex items-end gap-2 pt-1">
                  <div className="min-w-0 flex-1">
                    <SettingSlider
                      label="Pitch"
                      value={semitones}
                      valueText={signed(semitones, Math.abs(semitones) === 1 ? 'semitone' : 'semitones')}
                      onChange={setSemitones}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={busy}
                    />
                  </div>
                  <button
                    type="button"
                    className={chipButton}
                    disabled={semitones === 0}
                    title="Change the pitch without changing the length"
                    onClick={() => effect((p, s, e) => pitchShift(p, s, e, semitones))}
                  >
                    <Music className="h-4 w-4" aria-hidden="true" />
                    Apply
                  </button>
                </div>
              </section>

              {fxGroup(
                'Punch',
                scope,
                <>
                  <SettingSlider
                    label="Attack"
                    value={fx.attack}
                    valueText={signed(fx.attack, 'dB')}
                    onChange={(v) => setFx({ attack: v })}
                    min={-12}
                    max={12}
                    step={1}
                    disabled={busy}
                  />
                  <SettingSlider
                    label="Sustain"
                    value={fx.sustain}
                    valueText={signed(fx.sustain, 'dB')}
                    onChange={(v) => setFx({ sustain: v })}
                    min={-12}
                    max={12}
                    step={1}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Shape transients',
                    () => effect((p, s, e) => transient(p, s, e, fx.attack, fx.sustain)),
                    Zap,
                    !fx.attack && !fx.sustain,
                    'Attack makes the hit snappier or softer, sustain makes the body ring longer or shorter'
                  )}
                  <SettingSlider
                    label="Drive"
                    value={fx.drive}
                    valueText={`${fx.drive} dB`}
                    onChange={(v) => setFx({ drive: v })}
                    min={1}
                    max={30}
                    step={1}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Saturate',
                    () => effect((p, s, e) => saturate(p, s, e, fx.drive)),
                    Gauge,
                    false,
                    'Soft-clip for a thicker, louder, grittier sound'
                  )}
                </>
              )}

              {fxGroup(
                'Lo-fi',
                scope,
                <>
                  <SettingSlider
                    label="Bit depth"
                    value={fx.bits}
                    valueText={`${fx.bits} bit`}
                    onChange={(v) => setFx({ bits: v })}
                    min={2}
                    max={16}
                    step={1}
                    disabled={busy}
                  />
                  {listSlider(
                    'Sample rate',
                    CRUSH_RATES,
                    fx.rate,
                    (v) => setFx({ rate: v }),
                    (v) => (v ? hz(v) : 'Full'),
                    busy
                  )}
                  {actionBtn(
                    'Crush',
                    () => effect((p, s, e) => bitcrush(p, s, e, fx.bits, fx.rate || sampleRate)),
                    Cpu,
                    fx.bits >= 16 && !fx.rate,
                    'Fewer bits and a lower rate give a crunchy retro sound'
                  )}
                </>
              )}

              {fxGroup(
                'Filters',
                scope,
                <>
                  {listSlider(
                    'Low cut',
                    LOW_CUTS,
                    fx.lowCut,
                    (v) => setFx({ lowCut: v }),
                    (v) => (v ? hz(v) : 'Off'),
                    busy
                  )}
                  {listSlider(
                    'High cut',
                    HIGH_CUTS,
                    fx.highCut,
                    (v) => setFx({ highCut: v }),
                    (v) => (v ? hz(v) : 'Off'),
                    busy
                  )}
                  {actionBtn(
                    'Apply filters',
                    () => effect((p, s, e) => cutFilter(p, s, e, { lowCut: fx.lowCut, highCut: fx.highCut })),
                    Filter,
                    !fx.lowCut && !fx.highCut,
                    'Remove rumble below the low cut and hiss above the high cut (24 dB per octave)'
                  )}
                </>
              )}

              {fxGroup(
                'Equalizer',
                scope,
                <>
                  {EQ_BANDS.map(([band, label, freq]) => (
                    <SettingSlider
                      key={band}
                      label={`${label} (${freq})`}
                      value={eq[band]}
                      valueText={signed(eq[band], 'dB')}
                      onChange={(v) => setEq((q) => ({ ...q, [band]: v }))}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={busy}
                    />
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    {actionBtn('Apply EQ', () => effect((p, s, e) => equalize(p, s, e, eq)), SlidersHorizontal, flatEq)}
                    {actionBtn('Reset', () => setEq(FLAT_EQ), RotateCcw, flatEq)}
                  </div>
                </>
              )}

              {fxGroup(
                'Reverb',
                scope,
                <>
                  <SettingSlider
                    label="Decay"
                    value={fx.decay}
                    valueText={`${fx.decay.toFixed(1)} s`}
                    onChange={(v) => setFx({ decay: v })}
                    min={0.2}
                    max={5}
                    step={0.1}
                    disabled={busy}
                  />
                  <SettingSlider
                    label="Amount"
                    value={fx.amount}
                    valueText={`${fx.amount} %`}
                    onChange={(v) => setFx({ amount: v })}
                    min={5}
                    max={100}
                    step={5}
                    disabled={busy}
                  />
                  {actionBtn(
                    'Add reverb tail',
                    () => effect((p) => reverb(p, fx.decay, fx.amount / 100)),
                    Waves,
                    false,
                    'The tail rings on past the end and mixes with what follows'
                  )}
                </>
              )}

              {fxGroup(
                'Loop',
                scope,
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
                    <input type="checkbox" checked={glueOn} onChange={(e) => setGlueOn(e.target.checked)} className="h-4 w-4 accent-sky-400" />
                    Glue the tracks together
                    {glueOn && (
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-amber-200" title="Deepest gain reduction">
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
                            <button key={r} type="button" aria-pressed={glueSet.ratio === r} onClick={() => setGlue({ ratio: r })} className={segmentButton}>
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

              {fxGroup(
                'Generate',
                'new track at the cursor',
                <>
                  <div role="group" aria-label="Noise color" className={segmentGroup}>
                    {NOISE_COLORS.map((c) => (
                      <button key={c} type="button" aria-pressed={fx.noiseColor === c} onClick={() => setFx({ noiseColor: c })} className={segmentButton}>
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

              <section className="space-y-2">
                <p className={cn(sectionLabel, 'mt-0')}>Add audio</p>
                <div className="grid grid-cols-2 gap-2">
                  {actionBtn('At cursor', () => pickFile('cursor'), Plus, false, 'Insert another file into this track at the cursor')}
                  {actionBtn('At the end', () => pickFile('end'), Plus, false, 'Append another file to this track')}
                  {actionBtn('New track', () => pickFile('track'), Layers, false, 'Put another file on its own track, starting at the cursor')}
                  {actionBtn('1 s silence', insertSilence, Plus, false, 'Insert one second of silence at the cursor')}
                </div>
                <p className="text-xs text-slate-500">Or drop files onto a track, or below the last track to add a new one.</p>
              </section>

              <section className="space-y-3 border-t border-white/10 pt-4">
                <p className={cn(sectionLabel, 'mt-0')}>Export</p>
                <div role="group" aria-label="Export format" className={segmentGroup}>
                  {FORMATS.map(({ value, label }) => (
                    <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={segmentButton}>
                      {label}
                    </button>
                  ))}
                </div>
                {lossy && (
                  <div role="group" aria-label="Bitrate" className={segmentGroup}>
                    {BITRATES.map((b) => (
                      <button key={b} type="button" aria-pressed={kbps === b} onClick={() => setKbps(b)} className={segmentButton}>
                        {b} kbps
                      </button>
                    ))}
                  </div>
                )}
                <label className={cn('flex items-center gap-2 text-sm text-slate-200', !hasSelection && 'opacity-50')}>
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
                  <input type="checkbox" checked={matchLoudness} onChange={(e) => setMatchLoudness(e.target.checked)} className="h-4 w-4 accent-sky-400" />
                  Match loudness
                  {mixLufs !== null && (
                    <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-400" title="Loudness of the whole mix now">
                      {Number.isFinite(mixLufs) ? `now ${mixLufs.toFixed(1)} LUFS` : 'silent'}
                    </span>
                  )}
                </label>
                {matchLoudness && (
                  <>
                    <div role="group" aria-label="Target loudness in LUFS" className={segmentGroup}>
                      {LUFS_TARGETS.map((t) => (
                        <button key={t} type="button" aria-pressed={targetLufs === t} onClick={() => setTargetLufs(t)} className={segmentButton}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Target in LUFS, so every sound in a game plays equally loud. A limiter keeps peaks under -1 dB.</p>
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
                {muted.length > 0 && <p className="text-xs text-slate-500">Muted tracks are left out of the export.</p>}
                {estimate !== null && !Number.isNaN(estimate) && <p className="text-xs text-slate-500">Estimated size: ~{formatFileSize(estimate)}</p>}
              </section>
            </fieldset>
          </div>

          <dl className={statusRow}>
            {[
              ['Length', formatTimecode(duration)],
              ['Tracks', String(tracks.length)],
              ['Format', `${sampleRate} Hz, ${mixChannels === 1 ? 'mono' : mixChannels === 2 ? 'stereo' : `${mixChannels} ch`}`],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-1.5">
                <dt>{label}:</dt>
                <dd className="tabular-nums text-slate-200">{value}</dd>
              </div>
            ))}
            {progress !== null && (
              <div className="flex items-center gap-1.5">
                <dt>Exporting:</dt>
                <dd className="flex items-center gap-2 tabular-nums text-slate-200">
                  <Progress value={progress * 100} aria-label="Export progress" className="h-1.5 w-32" />
                  {Math.round(progress * 100)}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </ToolPageLayout>
  );
};

export default AudioEditor;
