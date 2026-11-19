import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Clapperboard,
  Copy,
  Download,
  Film,
  Keyboard,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SettingSlider from '@/components/tools/SettingSlider';
import SendToButtons from '@/components/tools/SendToButtons';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Tooltip } from '@/components/ui/tooltip';
import { useHistory, useObjectUrl } from '@/hooks';
import { cn } from '@/lib/utils';
import { VIDEO_MIME, withFFmpeg } from '@/utils/ffmpeg';
import { VIDEO_EXTENSIONS, getFileExtension, validateVideoFile } from '@/utils/fileValidation';
import { formatFileSize, formatTimecode } from '@/utils/formatters';
import { downloadBlob } from '@/utils/download';
import { toFile, useHandoff } from '@/utils/handoff';
import { buildEditArgs, clipLength, outputDuration, outputSize, type EditClip, type EditSettings } from '@/utils/videoEdit';
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

interface Clip {
  id: number;
  file: File;
  url: string;
  thumb: string;
  duration: number;
  width: number;
  height: number;
  start: number;
  end: number;
  muted: boolean;
  volume: number;
}

interface ExportResult {
  blob: Blob;
  ext: string;
  audioOnly: boolean;
}

const MIN_CLIP = 0.1;
const MAX_TOTAL_BYTES = 400 * 1024 * 1024;

const HEIGHTS = [
  { value: 0, label: 'Original' },
  { value: 1080, label: '1080p' },
  { value: 720, label: '720p' },
  { value: 480, label: '480p' },
];
const FPS_OPTIONS = [24, 30, 60];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ROTATIONS: EditSettings['rotate'][] = [0, 90, 180, 270];

const DEFAULT_SETTINGS: EditSettings = {
  format: 'mp4',
  crf: 23,
  height: 0,
  fps: 30,
  speed: 1,
  rotate: 0,
  flip: false,
  fadeIn: 0,
  fadeOut: 0,
  removeAudio: false,
};

let nextId = 1;

/** Reads duration, size and a thumbnail through the browser's own decoder. */
const readClip = (url: string): Promise<Omit<Clip, 'id' | 'file' | 'url'>> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.onerror = () => reject(new Error('This browser cannot play the file'));
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || !video.videoWidth) {
        reject(new Error('This browser cannot read the video track'));
        return;
      }
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = Math.max(1, Math.round((160 * video.videoHeight) / video.videoWidth));
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve({
        thumb: canvas.toDataURL('image/jpeg', 0.7),
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        start: 0,
        end: video.duration,
        muted: false,
        volume: 1,
      });
    };
    video.src = url;
  });

const iconBtn = (label: string, onClick: () => void, Icon: typeof Play, opts: { disabled?: boolean; shortcut?: string; pressed?: boolean } = {}) => (
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

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Clapperboard className="h-5 w-5" aria-hidden="true" />
      </span>
      Editing Videos
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Scissors className="h-5 w-5" aria-hidden="true" />
          Cut and Combine
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Trim:', 'drag the two handles under the player, or set start and end at the playhead.')}
          {guideItem('Split:', 'cuts the selected clip in two at the playhead, so you can drop a middle part.')}
          {guideItem('Combine:', 'add more videos and order them with the arrows. Different sizes get letterboxed.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          Effects and Export
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Speed:', 'slow motion or time lapse, sound included.')}
          {guideItem('Rotate & flip:', 'fixes sideways phone videos.')}
          {guideItem('Fades:', 'fade picture and sound in from and out to black.')}
          {guideItem('Audio only:', 'saves the soundtrack as MP3.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
          Shortcuts
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li><kbd className={guideKey}>Space</kbd> play / pause</li>
          <li><kbd className={guideKey}>I</kbd> / <kbd className={guideKey}>O</kbd> set start / end at the playhead</li>
          <li><kbd className={guideKey}>S</kbd> split, <kbd className={guideKey}>Del</kbd> remove clip</li>
          <li><kbd className={guideKey}>Ctrl+Z</kbd> / <kbd className={guideKey}>Ctrl+Y</kbd> undo / redo</li>
        </ul>
      </section>
    </div>
  </div>
);

const VideoEditor = () => {
  const { present: clips, commit, undo, redo, canUndo, canRedo } = useHistory<Clip[]>(() => []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settings, setSettings] = useState<EditSettings>(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(false);
  const [playAll, setPlayAll] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef(new Map<File, string>());
  const resultUrl = useObjectUrl(result && !result.audioOnly ? result.blob : null);

  const selected = clips.find((c) => c.id === selectedId) ?? clips[0] ?? null;
  const selectedIndex = selected ? clips.indexOf(selected) : -1;
  const totalBytes = [...new Set(clips.map((c) => c.file))].reduce((n, f) => n + f.size, 0);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const setOption = (patch: Partial<EditSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const updateClip = useCallback(
    (id: number, patch: Partial<Clip>, coalesce = false) =>
      commit(clips.map((c) => (c.id === id ? { ...c, ...patch } : c)), coalesce),
    [clips, commit]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const added: Clip[] = [];
      for (const file of files) {
        const validation = validateVideoFile(file);
        if (!validation.isValid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }
        let url = urlsRef.current.get(file);
        if (!url) {
          url = URL.createObjectURL(file);
          urlsRef.current.set(file, url);
        }
        try {
          added.push({ id: nextId++, file, url, ...(await readClip(url)) });
        } catch (error) {
          toast.error(`${file.name}: ${(error as Error).message}`, {
            description: 'Convert it to MP4 with the Video Converter first.',
          });
        }
      }
      if (added.length === 0) return;
      commit([...clips, ...added]);
      setSelectedId(added[0].id);
      setResult(null);
    },
    [clips, commit]
  );

  useHandoff((file) => void addFiles([file]));

  // FileUploadArea fires once per file; batch them so one drop is one undo step
  const pendingRef = useRef<File[]>([]);
  const queueFile = (file: File) => {
    pendingRef.current.push(file);
    if (pendingRef.current.length === 1) {
      queueMicrotask(() => {
        const files = pendingRef.current;
        pendingRef.current = [];
        void addFiles(files);
      });
    }
  };

  // Preview: keep the player inside the selected clip's trim range
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !selected || showResult) return;
    el.playbackRate = settings.speed;
    if (el.currentTime < selected.start || el.currentTime > selected.end) el.currentTime = selected.start;
  }, [selected, showResult, settings.speed]);

  useEffect(() => {
    if (!playing || showResult || !selected) return;
    let frame = 0;
    const tick = () => {
      const el = videoRef.current;
      if (el) {
        setPlayhead(el.currentTime);
        if (el.currentTime >= selected.end - 0.02 || el.ended) {
          const next = clips[selectedIndex + 1];
          if (playAll && next) {
            setSelectedId(next.id);
            // Same source keeps playing from the new start; a new source starts in onLoaded
            if (next.url === selected.url) el.currentTime = next.start;
            return;
          }
          el.pause();
          el.currentTime = selected.start;
          setPlaying(false);
          setPlayAll(false);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, playAll, selected, selectedIndex, clips, showResult]);

  const stopPlayback = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
    setPlayAll(false);
  }, []);

  const togglePlay = useCallback(
    (all = false) => {
      const el = videoRef.current;
      if (!el || !selected) return;
      if (playing) {
        stopPlayback();
        return;
      }
      setPlayAll(all);
      setPlaying(true);
      const first = clips[0];
      if (all && first.id !== selected.id) {
        setSelectedId(first.id);
        if (first.url !== selected.url) return; // onLoaded starts the new source
        el.currentTime = first.start;
      } else if (all || el.currentTime >= selected.end - 0.05) {
        el.currentTime = selected.start;
      }
      void el.play().catch(stopPlayback);
    },
    [playing, selected, clips, stopPlayback]
  );

  // A newly loaded source (other clip, or play all moving on) starts at its trim start
  const onLoaded = () => {
    const el = videoRef.current;
    if (!el || !selected) return;
    el.currentTime = selected.start;
    el.playbackRate = settings.speed;
    setPlayhead(selected.start);
    if (playing) void el.play().catch(stopPlayback);
  };

  const seek = (t: number) => {
    const el = videoRef.current;
    if (el) el.currentTime = t;
    setPlayhead(t);
  };

  const at = () => videoRef.current?.currentTime ?? 0;

  const setIn = useCallback(() => {
    if (!selected) return;
    updateClip(selected.id, { start: Math.min(at(), selected.end - MIN_CLIP) });
  }, [selected, updateClip]);

  const setOut = useCallback(() => {
    if (!selected) return;
    updateClip(selected.id, { end: Math.max(at(), selected.start + MIN_CLIP) });
  }, [selected, updateClip]);

  const split = useCallback(() => {
    if (!selected) return;
    const t = at();
    if (t <= selected.start + MIN_CLIP || t >= selected.end - MIN_CLIP) {
      toast.info('Move the playhead inside the clip to split it');
      return;
    }
    const second = { ...selected, id: nextId++, start: t };
    const next = clips.flatMap((c) => (c.id === selected.id ? [{ ...c, end: t }, second] : [c]));
    commit(next);
    setSelectedId(second.id);
  }, [selected, clips, commit]);

  const removeClip = useCallback(() => {
    if (!selected) return;
    const next = clips.filter((c) => c.id !== selected.id);
    commit(next);
    setSelectedId(next[Math.min(selectedIndex, next.length - 1)]?.id ?? null);
  }, [selected, selectedIndex, clips, commit]);

  const duplicate = () => {
    if (!selected) return;
    const copy = { ...selected, id: nextId++ };
    commit([...clips.slice(0, selectedIndex + 1), copy, ...clips.slice(selectedIndex + 1)]);
    setSelectedId(copy.id);
  };

  const move = (dir: -1 | 1) => {
    const to = selectedIndex + dir;
    if (!selected || to < 0 || to >= clips.length) return;
    const next = clips.slice();
    [next[selectedIndex], next[to]] = [next[to], next[selectedIndex]];
    commit(next);
  };

  const snapshot = () => {
    const el = videoRef.current;
    if (!el || !el.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    const name = (showResult ? 'edited' : selected?.file.name ?? 'video').replace(/\.[^.]+$/, '');
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${name}-frame-${el.currentTime.toFixed(2)}s.png`, { showToast: true });
    }, 'image/png');
  };

  const runExport = async (audioOnly: boolean) => {
    if (clips.length === 0) return;
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.error('Too much video for the browser', { description: 'Keep the source files under 400 MB in total.' });
      return;
    }
    videoRef.current?.pause();
    setPlaying(false);
    setExporting(true);
    setProgress(0);
    const ext = audioOnly ? 'mp3' : settings.format;
    try {
      const blob = await withFFmpeg(async (ff) => {
        const names = new Map<File, { name: string; hasAudio: boolean }>();
        for (const clip of clips) {
          if (names.has(clip.file)) continue;
          const name = `in${names.size}.${getFileExtension(clip.file.name) || 'mp4'}`;
          await ff.write(name, clip.file);
          names.set(clip.file, { name, hasAudio: await ff.hasAudio(name) });
        }
        const editClips: EditClip[] = clips.map((c) => {
          const input = names.get(c.file)!;
          return { inputName: input.name, hasAudio: input.hasAudio, start: c.start, end: c.end, width: c.width, height: c.height, muted: c.muted, volume: c.volume };
        });
        if (audioOnly && !editClips.some((c) => c.hasAudio && !c.muted)) throw new Error('None of the clips has audible sound');
        const out = `output.${ext}`;
        await ff.run(buildEditArgs(editClips, settings, out, audioOnly), outputDuration(clips, settings.speed));
        return ff.read(out, audioOnly ? 'audio/mpeg' : VIDEO_MIME[settings.format]);
      }, setProgress);
      setResult({ blob, ext, audioOnly });
      setShowResult(!audioOnly);
      toast.success(audioOnly ? 'Audio exported' : 'Video exported');
    } catch (error) {
      toast.error('Export failed', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setExporting(false);
    }
  };

  const resultFile = () => (result ? toFile(result.blob, clips[0]?.file.name, result.ext) : null);

  const download = () => {
    const file = resultFile();
    if (file) downloadBlob(file, file.name, { showToast: true });
  };

  const reset = () => {
    videoRef.current?.pause();
    setPlaying(false);
    commit([]);
    setSelectedId(null);
    setResult(null);
    setShowResult(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (clips.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (exporting || target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (key === 'z') {
          e.preventDefault();
          undo();
        }
        return;
      }
      if (e.code === 'Space' && !target.closest('button,video')) {
        e.preventDefault();
        togglePlay();
      } else if (key === 'i') setIn();
      else if (key === 'o') setOut();
      else if (key === 's') split();
      else if (key === 'delete') removeClip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clips.length, exporting, undo, redo, togglePlay, setIn, setOut, split, removeClip]);

  const total = outputDuration(clips, settings.speed);
  const size = outputSize(clips, settings);
  const timelineTotal = clips.reduce((n, c) => n + clipLength(c), 0) || 1;

  return (
    <ToolPageLayout
      title="Video Editor"
      description="Trim, split and combine videos, change speed, rotate, fade and export to MP4 or WebM. Everything runs in your browser."
      keywords="video editor, trim video, cut video, merge videos, combine videos, video speed, rotate video, online video editor"
      canonicalUrl="/tools/video-editor"
      pageTitle="Video Editor - sLixTOOLS"
      pageDescription="Free online video editor: trim, split, combine, speed up, rotate and fade videos right in your browser. No uploads."
      breadcrumbLabel="Video Editor"
      belowTool={seoContent}
      faq={[
        {
          question: 'Can I combine videos with different sizes?',
          answer: 'Yes. Every clip is scaled to fit the output size and centered with black bars, so portrait and landscape clips can be mixed.',
        },
        {
          question: 'Why does a video not load?',
          answer: 'The editor previews through your browser, which cannot play every format (AVI, WMV and some MKV files). Convert those to MP4 with the Video Converter first.',
        },
        {
          question: 'How long does exporting take?',
          answer: 'Exporting re-encodes the video on your device, so it takes roughly as long as the video itself at 720p, longer at 1080p. Short clips are quick.',
        },
        {
          question: 'Are my videos uploaded?',
          answer: 'No. Editing and exporting happen locally with WebAssembly. Nothing leaves your device.',
        },
      ]}
    >
      <div className={clips.length === 0 ? undefined : editorWorkspace}>
        <input
          ref={fileInputRef}
          type="file"
          accept={VIDEO_EXTENSIONS.map((e) => `.${e}`).join(',')}
          multiple
          hidden
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        {clips.length === 0 ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
              multiple
              onFileSelected={queueFile}
              acceptedTypes={VIDEO_EXTENSIONS}
              fileCategory="video"
              title="Drop your videos here"
              description="One to trim, several to combine (MP4, WebM, MOV and more)"
            />
            <ul className={editorFeatures}>
              <li>Trim &amp; split</li>
              <li>Combine clips</li>
              <li>Speed &amp; rotate</li>
              <li>Fades &amp; volume</li>
              <li>Export MP4, WebM, MP3</li>
            </ul>
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <div className="flex items-center gap-1">
                {iconBtn('Remove all clips', reset, Trash2, { disabled: exporting })}
                {iconBtn('Undo', undo, Undo2, { disabled: !canUndo || exporting, shortcut: 'Ctrl+Z' })}
                {iconBtn('Redo', redo, Redo2, { disabled: !canRedo || exporting, shortcut: 'Ctrl+Y' })}
              </div>
              <ToolbarDivider />
              <button type="button" className={chipButton} disabled={exporting} onClick={() => fileInputRef.current?.click()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add clips
              </button>
              {resultUrl && (
                <div role="group" aria-label="Preview" className={segmentGroup}>
                  {(['Timeline', 'Result'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={showResult === (mode === 'Result')}
                      onClick={() => {
                        stopPlayback();
                        setShowResult(mode === 'Result');
                      }}
                      className={segmentButton}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <button type="button" className={chipButton} disabled={exporting} onClick={() => void runExport(true)}>
                  <Music className="h-4 w-4" aria-hidden="true" />
                  Audio only
                </button>
                <button
                  type="button"
                  className={result ? chipButton : primaryButton}
                  disabled={exporting}
                  onClick={() => void runExport(false)}
                >
                  <Film className="h-4 w-4" aria-hidden="true" />
                  {exporting ? 'Exporting...' : 'Export video'}
                </button>
                {result && (
                  <>
                    <SendToButtons
                      getFile={resultFile}
                      disabled={exporting}
                      targets={
                        result.audioOnly
                          ? [{ label: 'Audio Editor', path: '/tools/audio-editor' }]
                          : [
                              { label: 'Converter', path: '/tools/video-converter' },
                              { label: 'GIF', path: '/tools/video-to-gif' },
                            ]
                      }
                    />
                    <button type="button" className={primaryButton} disabled={exporting} onClick={download}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {result.ext.toUpperCase()}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={settingsGrid}>
              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="relative min-h-[40dvh] flex-1 bg-black/40 lg:min-h-0">
                  {showResult && resultUrl ? (
                    <video key="result" ref={videoRef} src={resultUrl} controls className="absolute inset-0 h-full w-full object-contain" />
                  ) : (
                    selected && (
                      <video
                        ref={videoRef}
                        src={selected.url}
                        muted={selected.muted}
                        onLoadedMetadata={onLoaded}
                        onClick={() => togglePlay()}
                        onSeeked={(e) => setPlayhead(e.currentTarget.currentTime)}
                        className={cn('absolute inset-0 h-full w-full cursor-pointer object-contain', settings.flip && '-scale-x-100')}
                      />
                    )
                  )}
                </div>

                {!showResult && selected && (
                  <div className="space-y-3 border-t border-white/10 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {iconBtn(playing ? 'Pause' : 'Play clip', () => togglePlay(), playing ? Pause : Play, { shortcut: 'Space' })}
                      <button type="button" className={chipButton} onClick={() => togglePlay(true)} disabled={playing}>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Play all
                      </button>
                      <span className="font-mono text-xs tabular-nums text-slate-300">
                        {formatTimecode(playhead)} / {formatTimecode(selected.duration)}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {iconBtn('Set start at playhead', setIn, ArrowRight, { shortcut: 'I' })}
                        {iconBtn('Set end at playhead', setOut, ArrowLeft, { shortcut: 'O' })}
                        {iconBtn('Split at playhead', split, Scissors, { shortcut: 'S' })}
                        {iconBtn('Save frame as PNG', snapshot, Camera)}
                      </div>
                    </div>
                    <Slider
                      aria-label="Playhead"
                      min={0}
                      max={selected.duration}
                      step={0.01}
                      value={[playhead]}
                      onValueChange={([t]) => seek(t ?? 0)}
                    />
                    <p className={cn(sectionLabel, '-mb-1')}>Trim</p>
                    <Slider
                      aria-label="Trim range"
                      min={0}
                      max={selected.duration}
                      step={0.01}
                      minStepsBetweenThumbs={10}
                      value={[selected.start, selected.end]}
                      onValueChange={([start, end]) => {
                        updateClip(selected.id, { start, end }, true);
                        seek(start !== selected.start ? start : end);
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3" role="list" aria-label="Timeline">
                  {clips.map((clip, i) => (
                    <button
                      key={clip.id}
                      type="button"
                      role="listitem"
                      onClick={() => {
                        stopPlayback();
                        setShowResult(false);
                        setSelectedId(clip.id);
                      }}
                      aria-current={clip.id === selected?.id}
                      style={{ flexGrow: clipLength(clip) / timelineTotal, flexBasis: 0 }}
                      className="group relative h-16 min-w-24 overflow-hidden rounded-md border border-white/15 bg-cover bg-center text-left aria-[current=true]:border-sky-400 aria-[current=true]:ring-2 aria-[current=true]:ring-sky-400/40"
                    >
                      <img src={clip.thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                      <span className="relative flex h-full flex-col justify-between p-1.5 text-[11px] text-white [text-shadow:0_1px_2px_#000]">
                        <span className="truncate">{i + 1}. {clip.file.name}</span>
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          {formatTimecode(clipLength(clip))}
                          {clip.muted && <VolumeX className="h-3 w-3" aria-label="muted" />}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <fieldset disabled={exporting} className={cn(settingsColumn, 'min-w-0')}>
                {selected && !showResult && (
                  <div className="space-y-3">
                    <p className={cn(sectionLabel, 'mt-0')}>Clip {selectedIndex + 1} of {clips.length}</p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs text-slate-300">
                      <span>Start {formatTimecode(selected.start)}</span>
                      <span>End {formatTimecode(selected.end)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {iconBtn('Move left', () => move(-1), ArrowLeft, { disabled: selectedIndex <= 0 })}
                      {iconBtn('Move right', () => move(1), ArrowRight, { disabled: selectedIndex >= clips.length - 1 })}
                      {iconBtn('Duplicate clip', duplicate, Copy)}
                      {iconBtn(selected.muted ? 'Unmute clip' : 'Mute clip', () => updateClip(selected.id, { muted: !selected.muted }), selected.muted ? VolumeX : Volume2, { pressed: selected.muted })}
                      {iconBtn('Remove clip', removeClip, Trash2, { shortcut: 'Del' })}
                    </div>
                    <SettingSlider
                      label="Clip volume"
                      value={selected.volume}
                      valueText={`${Math.round(selected.volume * 100)}%`}
                      onChange={(volume) => updateClip(selected.id, { volume }, true)}
                      min={0}
                      max={2}
                      step={0.05}
                      disabled={selected.muted || exporting}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Format</p>
                  <div role="group" aria-label="Output format" className={segmentGroup}>
                    {(['mp4', 'webm'] as const).map((format) => (
                      <button key={format} type="button" aria-pressed={settings.format === format} onClick={() => setOption({ format })} className={segmentButton}>
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Resolution</p>
                  <div role="group" aria-label="Output resolution" className={segmentGroup}>
                    {HEIGHTS.map(({ value, label }) => (
                      <button key={value} type="button" aria-pressed={settings.height === value} onClick={() => setOption({ height: value })} className={segmentButton}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Frame rate</p>
                  <div role="group" aria-label="Frame rate" className={segmentGroup}>
                    {FPS_OPTIONS.map((fps) => (
                      <button key={fps} type="button" aria-pressed={settings.fps === fps} onClick={() => setOption({ fps })} className={segmentButton}>
                        {fps} fps
                      </button>
                    ))}
                  </div>
                </div>
                <SettingSlider
                  label="Quality (CRF)"
                  value={settings.crf}
                  valueText={String(settings.crf)}
                  onChange={(crf) => setOption({ crf })}
                  min={18}
                  max={35}
                  step={1}
                  hint="Lower values = higher quality, larger file size"
                  disabled={exporting}
                />
                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Speed</p>
                  <div role="group" aria-label="Speed" className={segmentGroup}>
                    {SPEEDS.map((speed) => (
                      <button key={speed} type="button" aria-pressed={settings.speed === speed} onClick={() => setOption({ speed })} className={segmentButton}>
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Rotate</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div role="group" aria-label="Rotation" className={segmentGroup}>
                      {ROTATIONS.map((rotate) => (
                        <button key={rotate} type="button" aria-pressed={settings.rotate === rotate} onClick={() => setOption({ rotate })} className={segmentButton}>
                          {rotate}°
                        </button>
                      ))}
                    </div>
                    <button type="button" aria-pressed={settings.flip} onClick={() => setOption({ flip: !settings.flip })} className={cn(segmentButton, 'bg-white/[0.06]')}>
                      Mirror
                    </button>
                  </div>
                </div>
                <SettingSlider
                  label="Fade in"
                  value={settings.fadeIn}
                  valueText={settings.fadeIn ? `${settings.fadeIn.toFixed(1)} s` : 'Off'}
                  onChange={(fadeIn) => setOption({ fadeIn })}
                  min={0}
                  max={3}
                  step={0.5}
                  disabled={exporting}
                />
                <SettingSlider
                  label="Fade out"
                  value={settings.fadeOut}
                  valueText={settings.fadeOut ? `${settings.fadeOut.toFixed(1)} s` : 'Off'}
                  onChange={(fadeOut) => setOption({ fadeOut })}
                  min={0}
                  max={3}
                  step={0.5}
                  disabled={exporting}
                />
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.removeAudio}
                    onChange={(e) => setOption({ removeAudio: e.target.checked })}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Remove sound from the video
                </label>
              </fieldset>
            </div>

            <dl className={statusRow}>
              {[
                ['Clips', String(clips.length)],
                ['Length', formatTimecode(total)],
                ['Output', `${size.width}×${size.height}`],
                ['Sources', formatFileSize(totalBytes)],
                ...(result ? [['Result', formatFileSize(result.blob.size)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt>{label}:</dt>
                  <dd className="tabular-nums text-slate-200">{value}</dd>
                </div>
              ))}
              {exporting && (
                <div className="flex items-center gap-1.5">
                  <dt>Exporting:</dt>
                  <dd className="flex items-center gap-2 tabular-nums text-slate-200">
                    <Progress value={progress * 100} aria-label="Export progress" className="h-1.5 w-32" />
                    {Math.round(progress * 100)}%
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default VideoEditor;
