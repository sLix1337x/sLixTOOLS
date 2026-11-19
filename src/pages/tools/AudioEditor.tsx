import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  Crop,
  Download,
  FlipHorizontal2,
  Keyboard,
  Maximize2,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  Scissors,
  Shrink,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Undo2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
  computePeaks,
  deleteRange,
  encodeWav,
  fade,
  fromAudioBuffer,
  gain,
  insertAt,
  keepRange,
  normalize,
  pcmDuration,
  pcmLength,
  reverse,
  silence,
  type Pcm,
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
/** Decoded audio kept in memory across all undo steps */
const MEMORY_BUDGET = 800 * 1024 * 1024;
const MAX_ZOOM = 64;
const MAX_CANVAS = 16384;
/** Ruler tick spacing candidates in seconds; the first one at least MIN_TICK_PX wide wins */
const RULER_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const MIN_TICK_PX = 80;
const WAVE = '#38bdf8';
const WAVE_DIM = 'rgba(56,189,248,0.4)';
const WAVE_SELECTED = '#bae6fd';

interface Selection {
  start: number;
  end: number;
}

let audioContext: AudioContext | null = null;
const getContext = () => (audioContext ??= new AudioContext());

const decode = async (file: File): Promise<Pcm> => {
  try {
    return fromAudioBuffer(await getContext().decodeAudioData(await file.arrayBuffer()));
  } catch {
    throw new Error(`${file.name} has no sound this browser can decode`);
  }
};

const pcmBytes = (pcm: Pcm) => pcmLength(pcm) * pcm.channels.length * 4;

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

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

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
          Cut and Combine
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Select:', 'drag across the waveform, then drag the handles to adjust. Shift+click extends the selection.')}
          {guideItem('Trim / Delete:', 'keep only the selection, or cut it out.')}
          {guideItem('Combine:', 'insert another file at the cursor or append it to the end.')}
          {guideItem('From video:', 'drop a video to edit or extract its soundtrack.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          Effects and Export
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Effects:', 'apply to the selection, or to everything when nothing is selected.')}
          {guideItem('Normalize:', 'raises the volume until the loudest peak just fits.')}
          {guideItem('Formats:', 'MP3, WAV, OGG, FLAC and M4A, so this doubles as an audio converter.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Shortcuts
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li><kbd className={guideKey}>Space</kbd> play / pause, <kbd className={guideKey}>Home</kbd> / <kbd className={guideKey}>End</kbd> jump</li>
          <li><kbd className={guideKey}>Ctrl</kbd> + mouse wheel zoom, wheel scrolls when zoomed</li>
          <li><kbd className={guideKey}>Del</kbd> delete selection, <kbd className={guideKey}>Esc</kbd> clear it</li>
          <li><kbd className={guideKey}>Ctrl+A</kbd> select all</li>
          <li><kbd className={guideKey}>Ctrl+Z</kbd> / <kbd className={guideKey}>Ctrl+Y</kbd> undo / redo</li>
        </ul>
      </section>
    </div>
  </div>
);

const AudioEditor = () => {
  const [historyLimit, setHistoryLimit] = useState(30);
  const { present: pcm, commit, undo, redo, canUndo, canRedo } = useHistory<Pcm | null>(() => null, historyLimit);
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gainDb, setGainDb] = useState(3);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [kbps, setKbps] = useState(192);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewWidth, setViewWidth] = useState(800);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const insertInputRef = useRef<HTMLInputElement>(null);
  const insertModeRef = useRef<'cursor' | 'end'>('cursor');
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dragRef = useRef<number | null>(null);

  const duration = pcm ? pcmDuration(pcm) : 0;
  const hasSelection = selection.end - selection.start > 0.001;
  const toSample = (t: number) => Math.round(t * (pcm?.sampleRate ?? 1));
  // Effects work on the selection, or on everything when nothing is selected
  const range = (): [number, number] => (hasSelection ? [toSample(selection.start), toSample(selection.end)] : [0, pcm ? pcmLength(pcm) : 0]);

  // ---- loading ----
  const load = useCallback(
    async (next: File) => {
      setBusy(true);
      try {
        const decoded = await decode(next);
        if (pcmBytes(decoded) > MEMORY_BUDGET / 2) throw new Error('This file is too long to edit in the browser');
        setHistoryLimit(Math.max(3, Math.min(30, Math.floor(MEMORY_BUDGET / pcmBytes(decoded)))));
        stop();
        commit(decoded);
        setFile(next);
        setSelection({ start: 0, end: 0 });
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
    if (!pcm) return;
    stop();
    const ctx = getContext();
    void ctx.resume();
    const buffer = ctx.createBuffer(pcm.channels.length, Math.max(1, pcmLength(pcm)), pcm.sampleRate);
    pcm.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
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
    // Without loop a selection plays to its end; a cursor plays to the end of the file
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

  // ---- edits ----
  const apply = (next: Pcm, nextSelection: Selection = selection) => {
    stop();
    commit(next);
    const d = pcmDuration(next);
    setSelection({ start: Math.min(nextSelection.start, d), end: Math.min(nextSelection.end, d) });
    setPlayhead((p) => Math.min(p, d));
  };

  const requireSelection = () => {
    if (!hasSelection) toast.info('Select a part of the waveform first');
    return hasSelection;
  };

  const trimToSelection = () => {
    if (!pcm || !requireSelection()) return;
    apply(keepRange(pcm, ...range()), { start: 0, end: 0 });
    setPlayhead(0);
  };

  const deleteSelection = () => {
    if (!pcm || !requireSelection()) return;
    apply(deleteRange(pcm, ...range()), { start: selection.start, end: selection.start });
    setPlayhead(selection.start);
  };

  const effect = (fn: (p: Pcm, s: number, e: number) => Pcm) => {
    if (pcm) apply(fn(pcm, ...range()));
  };

  const insertSilence = () => {
    if (!pcm) return;
    const second: Pcm = { sampleRate: pcm.sampleRate, channels: pcm.channels.map(() => new Float32Array(pcm.sampleRate)) };
    const at = selection.start;
    apply(insertAt(pcm, second, toSample(at)), { start: at, end: at + 1 });
  };

  const insertFile = async (other: File) => {
    if (!pcm) return;
    setBusy(true);
    try {
      const decoded = await decode(other);
      if (decoded.sampleRate !== pcm.sampleRate) throw new Error('Sample rates differ');
      const atEnd = insertModeRef.current === 'end';
      const at = atEnd ? duration : selection.start;
      const next = insertAt(pcm, decoded, toSample(at));
      setHistoryLimit(Math.max(3, Math.min(30, Math.floor(MEMORY_BUDGET / pcmBytes(next)))));
      apply(next, { start: at, end: at + pcmDuration(decoded) });
      toast.success(`${other.name} ${atEnd ? 'appended' : 'inserted'}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ---- export ----
  const exportAudio = async () => {
    if (!pcm) return;
    const source = selectionOnly && hasSelection ? keepRange(pcm, ...range()) : pcm;
    setBusy(true);
    setProgress(0);
    try {
      const wav = encodeWav(source);
      const blob =
        format === 'wav'
          ? wav
          : await withFFmpeg(async (ff) => {
              await ff.write('in.wav', wav);
              await ff.run(['-i', 'in.wav', ...audioCodecArgs(format, kbps), `out.${format}`], pcmDuration(source));
              return ff.read(`out.${format}`, AUDIO_MIME[format]);
            }, setProgress);
      const out = toFile(blob, file?.name, format);
      downloadBlob(out, out.name, { showToast: true });
    } catch (error) {
      toast.error('Export failed', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  // ---- waveform ----
  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewWidth(el.clientWidth));
    observer.observe(el);
    setViewWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [pcm !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const canvasWidth = Math.min(MAX_CANVAS, Math.max(1, Math.round(viewWidth * zoom)));
  // One lane per channel
  const peaks = useMemo(
    () => pcm?.channels.map((ch) => computePeaks({ sampleRate: pcm.sampleRate, channels: [ch] }, 0, ch.length, canvasWidth)) ?? null,
    [pcm, canvasWidth]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !peaks || !duration) return;
    const height = canvas.clientHeight;
    canvas.width = canvasWidth;
    canvas.height = height;
    ctx.clearRect(0, 0, canvasWidth, height);
    const laneHeight = height / peaks.length;
    const bars = (color: string) => {
      ctx.fillStyle = color;
      peaks.forEach((lane, c) => {
        const mid = laneHeight * (c + 0.5);
        const amp = (laneHeight / 2) * 0.9;
        for (let x = 0; x < canvasWidth; x++) {
          const min = lane[x * 2];
          const max = lane[x * 2 + 1];
          ctx.fillRect(x, mid - max * amp, 1, Math.max(1, (max - min) * amp));
        }
      });
    };
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    peaks.forEach((_, c) => {
      ctx.fillRect(0, Math.round(laneHeight * (c + 0.5)), canvasWidth, 1); // zero line
      if (c > 0) ctx.fillRect(0, Math.round(laneHeight * c), canvasWidth, 1); // lane divider
    });
    bars(hasSelection ? WAVE_DIM : WAVE);
    if (hasSelection) {
      const a = (selection.start / duration) * canvasWidth;
      const b = (selection.end / duration) * canvasWidth;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, 0, b - a, height);
      ctx.clip();
      bars(WAVE_SELECTED);
      ctx.restore();
    }
  }, [peaks, canvasWidth, duration, hasSelection, selection.start, selection.end]);

  const tickStep = RULER_STEPS.find((s) => (s / (duration || 1)) * canvasWidth >= MIN_TICK_PX) ?? RULER_STEPS[RULER_STEPS.length - 1];
  const ticks = duration ? Array.from({ length: Math.floor(duration / tickStep + 1e-6) + 1 }, (_, i) => Math.round(i * tickStep * 10) / 10) : [];
  const tickLabel = (t: number) => (tickStep >= 1 ? formatTimecode(t).replace(/\.\d$/, '') : formatTimecode(t));

  // Keep the playhead in view while zoomed in and playing
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !playing || zoom === 1 || !duration) return;
    const x = (playhead / duration) * canvasWidth;
    if (x < view.scrollLeft || x > view.scrollLeft + view.clientWidth - 20) view.scrollLeft = x - 20;
  }, [playhead, playing, zoom, duration, canvasWidth]);

  const timeAt = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pcm || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeAt(e.clientX);
    const anchor = e.shiftKey ? (Math.abs(t - selection.start) < Math.abs(t - selection.end) ? selection.end : selection.start) : t;
    dragRef.current = anchor;
    setSelection({ start: Math.min(anchor, t), end: Math.max(anchor, t) });
    if (!e.shiftKey) seek(t);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = timeAt(e.clientX);
    setHoverTime(t);
    if (dragRef.current === null) return;
    setSelection({ start: Math.min(dragRef.current, t), end: Math.max(dragRef.current, t) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    onPointerMove(e); // fast drags can release past the last move event
    dragRef.current = null;
  };
  /** Grabbing a selection edge drags it while the opposite edge stays put */
  const onHandleDown = (e: React.PointerEvent, edge: keyof Selection) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
    dragRef.current = edge === 'start' ? selection.end : selection.start;
  };

  /** Zooms keeping focus (seconds) at anchor px from the view's left edge; defaults to centering the selection or cursor */
  const zoomTo = (next: number, focus = hasSelection ? (selection.start + selection.end) / 2 : playhead, anchor?: number) => {
    const view = viewRef.current;
    const z = Math.max(1, Math.min(MAX_ZOOM, next));
    setZoom(z);
    requestAnimationFrame(() => {
      if (view && duration) view.scrollLeft = (focus / duration) * view.scrollWidth - (anchor ?? view.clientWidth / 2);
    });
  };

  // Ctrl/Cmd + wheel zooms around the pointer; a plain wheel scrolls sideways while zoomed in.
  // Native listener: React's wheel handler is passive and cannot preventDefault.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const view = viewRef.current;
    if (!view || !duration) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const x = e.clientX - view.getBoundingClientRect().left;
      zoomTo(zoom * (e.deltaY < 0 ? 1.25 : 0.8), ((view.scrollLeft + x) / view.scrollWidth) * duration, x);
    } else if (zoom > 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
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
  }, [pcm !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomToSelection = () => {
    if (!requireSelection() || !duration) return;
    zoomTo(duration / (selection.end - selection.start));
  };

  // ---- keyboard ----
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!pcm || busy || target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === 'y' || (key === 'z' && e.shiftKey)) redo();
      else if (key === 'z') undo();
      else if (key === 'a') setSelection({ start: 0, end: duration });
      else return;
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' && !target.closest('button')) {
      e.preventDefault();
      togglePlay();
    } else if (key === 'delete' || key === 'backspace') deleteSelection();
    else if (key === 'escape') setSelection({ start: playhead, end: playhead });
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

  const pct = (t: number) => `${duration ? (t / duration) * 100 : 0}%`;
  const lossy = LOSSY.includes(format);
  const exportSeconds = selectionOnly && hasSelection ? selection.end - selection.start : duration;
  // FLAC depends on the content, so no estimate
  const estimate = !pcm ? null : format === 'wav' ? exportSeconds * pcm.sampleRate * pcm.channels.length * 2 : lossy ? exportSeconds * kbps * 125 : null;

  return (
    <ToolPageLayout
      title="Audio Editor"
      description="Cut, trim, combine and fade audio, then export as MP3, WAV, OGG, FLAC or M4A. Everything runs in your browser."
      keywords="audio editor, cut mp3, trim audio, merge audio, combine mp3, audio converter, mp3 to wav, extract audio from video, normalize audio"
      canonicalUrl="/tools/audio-editor"
      pageTitle="Audio Editor - sLixTOOLS"
      pageDescription="Free online audio editor and converter: cut, trim, merge, fade and normalize audio, export MP3, WAV, OGG, FLAC or M4A. No uploads."
      breadcrumbLabel="Audio Editor"
      belowTool={seoContent}
      faq={[
        {
          question: 'Which files can I open?',
          answer: 'Anything your browser can decode: MP3, WAV, OGG, FLAC, M4A/AAC, Opus and the soundtrack of most MP4 and WebM videos.',
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
      {!pcm || !file ? (
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
            <li>Trim &amp; cut</li>
            <li>Fades &amp; volume</li>
            <li>Normalize &amp; reverse</li>
            <li>Combine files</li>
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
                {progress !== null ? 'Exporting...' : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className={settingsGrid}>
            <div className="flex min-h-[22rem] min-w-0 flex-col lg:min-h-0">
              <div className="relative min-h-0 flex-1 bg-black/30">
                <div ref={viewRef} className="h-full overflow-x-auto overflow-y-hidden">
                  <div className="flex h-full flex-col" style={{ width: canvasWidth }}>
                    {/* Ruler: click to move the cursor */}
                    <div
                      className="relative h-7 shrink-0 cursor-pointer select-none overflow-hidden border-b border-white/10 bg-white/[0.03]"
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
                      className="relative min-h-0 flex-1 cursor-text touch-none select-none"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={() => (dragRef.current = null)}
                      onPointerLeave={() => setHoverTime(null)}
                      role="group"
                      aria-label="Waveform: click to place the cursor, drag to select"
                    >
                      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                      {hasSelection && (
                        <>
                          <div
                            className="pointer-events-none absolute inset-y-0 bg-sky-400/10 ring-1 ring-inset ring-sky-300/60"
                            style={{ left: pct(selection.start), width: pct(selection.end - selection.start) }}
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
                      {hoverTime !== null && (
                        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/30" style={{ left: pct(hoverTime) }}>
                          <span className="absolute left-1 top-1 rounded bg-black/70 px-1 font-mono text-[10px] text-slate-200">
                            {formatTimecode(hoverTime)}
                          </span>
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
                        style={{ left: pct(playhead) }}
                      />
                    </div>
                  </div>
                </div>
                {pcm.channels.length === 2 &&
                  ['L', 'R'].map((label, c) => (
                    <span
                      key={label}
                      className="pointer-events-none absolute right-2 rounded bg-black/60 px-1 font-mono text-[10px] text-slate-400"
                      style={{ top: `calc(1.75rem + (100% - 1.75rem) * ${c / 2} + 0.375rem)` }}
                    >
                      {label}
                    </span>
                  ))}
                {!hasSelection && (
                  <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-xs text-slate-300">
                    Drag across the waveform to select a part
                  </p>
                )}
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
                      onClick={() => setSelection({ start: playhead, end: playhead })}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-sky-200 hover:bg-white/10"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 sm:ml-auto">
                  {iconBtn('Zoom out', () => zoomTo(zoom / 2), ZoomOut, { disabled: zoom <= 1, shortcut: 'Ctrl+Wheel' })}
                  <span className="w-10 text-center font-mono text-xs tabular-nums text-slate-400">
                    {zoom < 10 ? zoom.toFixed(1).replace(/\.0$/, '') : Math.round(zoom)}×
                  </span>
                  {iconBtn('Zoom in', () => zoomTo(zoom * 2), ZoomIn, { disabled: zoom >= MAX_ZOOM, shortcut: 'Ctrl+Wheel' })}
                  {iconBtn('Zoom to selection', zoomToSelection, Maximize2, { disabled: !hasSelection })}
                  {iconBtn('Show whole file', () => zoomTo(1), Shrink, { disabled: zoom <= 1 })}
                </div>
              </div>
            </div>

            <fieldset disabled={busy} className={cn(settingsColumn, 'min-w-0')}>
              <section className="space-y-2">
                <p className={cn(sectionLabel, 'mt-0')}>Cut selection</p>
                <div className="grid grid-cols-3 gap-2">
                  {actionBtn('Trim', trimToSelection, Crop, !hasSelection, 'Keep only the selection')}
                  {actionBtn('Delete', deleteSelection, Scissors, !hasSelection, 'Cut the selection out (Del)')}
                  {actionBtn('Silence', () => requireSelection() && effect(silence), VolumeX, !hasSelection, 'Mute the selection')}
                </div>
                {!hasSelection && <p className="text-xs text-slate-500">Drag across the waveform first.</p>}
              </section>

              <section className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Effects</p>
                  <span className="text-[11px] text-slate-500">{hasSelection ? 'on the selection' : 'on the whole file'}</span>
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
                      valueText={`${gainDb > 0 ? '+' : ''}${gainDb} dB`}
                      onChange={setGainDb}
                      min={-20}
                      max={20}
                      step={1}
                      disabled={busy}
                    />
                  </div>
                  <button
                    type="button"
                    className={chipButton}
                    disabled={gainDb === 0}
                    onClick={() => effect((p, s, e) => gain(p, s, e, 10 ** (gainDb / 20)))}
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Apply
                  </button>
                </div>
              </section>

              <section className="space-y-2">
                <p className={cn(sectionLabel, 'mt-0')}>Add audio</p>
                <div className="grid grid-cols-2 gap-2">
                  {actionBtn('At cursor', () => {
                    insertModeRef.current = 'cursor';
                    insertInputRef.current?.click();
                  }, Plus, false, 'Insert another file at the cursor')}
                  {actionBtn('At the end', () => {
                    insertModeRef.current = 'end';
                    insertInputRef.current?.click();
                  }, Plus, false, 'Append another file')}
                </div>
                {actionBtn('Insert 1 s silence', insertSilence, Plus, false, 'Insert one second of silence at the cursor')}
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
                  Export only the selection
                </label>
                {estimate !== null && <p className="text-xs text-slate-500">Estimated size: ~{formatFileSize(estimate)}</p>}
              </section>
            </fieldset>
          </div>

          <dl className={statusRow}>
            {[
              ['Length', formatTimecode(duration)],
              ['Format', `${pcm.sampleRate} Hz, ${pcm.channels.length === 1 ? 'mono' : pcm.channels.length === 2 ? 'stereo' : `${pcm.channels.length} ch`}`],
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
