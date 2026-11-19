/**
 * Shared FFmpeg (WASM) session used by the video converter, video editor and audio editor.
 * Single-thread core from public/workers: no SharedArrayBuffer / cross-origin isolation needed.
 */
import type { FFmpeg } from '@ffmpeg/ffmpeg';

export interface FFmpegSession {
  write(name: string, data: Blob): Promise<void>;
  /** Runs ffmpeg; throws with the log tail on a non-zero exit. Progress is measured against
   *  totalSeconds, or against the first input's duration when it is omitted. */
  run(args: string[], totalSeconds?: number): Promise<void>;
  read(name: string, type: string): Promise<Blob>;
  /** True when the container holds at least one audio stream. */
  hasAudio(name: string): Promise<boolean>;
}

/** 0..1 */
export type ProgressFn = (ratio: number) => void;

const TIME_RE = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;
const DURATION_RE = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;
const toSeconds = (m: RegExpExecArray) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

const loadCore = async (ffmpeg: FFmpeg) => {
  const base = new URL(`${import.meta.env.BASE_URL || '/'}workers/`, window.location.origin).href;
  try {
    await ffmpeg.load({ coreURL: `${base}ffmpeg-core.js`, wasmURL: `${base}ffmpeg-core.wasm` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load the video engine (${message}). Check your connection and reload the page.`);
  }
};

/** Loads a fresh FFmpeg instance, hands it to fn and always terminates it afterwards. */
export async function withFFmpeg<T>(fn: (session: FFmpegSession) => Promise<T>, onProgress?: ProgressFn): Promise<T> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = new FFmpeg();
  let log: string[] = [];
  let total = 0;
  let autoTotal = false;

  ffmpeg.on('log', ({ message }) => {
    if (import.meta.env.DEV) console.debug('[ffmpeg]', message);
    log.push(message);
    if (log.length > 400) log = log.slice(-200);
    const d = autoTotal ? DURATION_RE.exec(message) : null;
    if (d) {
      total = toSeconds(d);
      autoTotal = false;
    }
    const m = total > 0 && onProgress ? TIME_RE.exec(message) : null;
    if (m) onProgress!(Math.min(1, toSeconds(m) / total));
  });

  const session: FFmpegSession = {
    async write(name, data) {
      await ffmpeg.writeFile(name, new Uint8Array(await data.arrayBuffer()));
    },
    async run(args, totalSeconds) {
      log = [];
      total = totalSeconds ?? 0;
      autoTotal = totalSeconds === undefined;
      // Default stats period (0.5 s) ends before short clips report any progress
      const code = await ffmpeg.exec(['-hide_banner', '-stats_period', '0.1', ...args]);
      total = 0;
      autoTotal = false;
      if (code !== 0) throw new Error(`FFmpeg exited with code ${code}: ${log.slice(-5).join(' | ')}`);
    },
    async read(name, type) {
      const data = await ffmpeg.readFile(name);
      // FFmpeg may return a view on a SharedArrayBuffer; slice() copies into a plain ArrayBuffer Blob accepts
      return new Blob([data instanceof Uint8Array ? data.slice() : new TextEncoder().encode(data)], { type });
    },
    async hasAudio(name) {
      log = [];
      await ffmpeg.exec(['-hide_banner', '-i', name]); // no output given: exits non-zero after printing streams
      return log.some((line) => /Stream #\d+:\d+.*Audio:/.test(line));
    },
  };

  await loadCore(ffmpeg);
  try {
    return await fn(session);
  } finally {
    try {
      ffmpeg.terminate();
    } catch {
      /* already gone */
    }
  }
}

export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov';

export const VIDEO_MIME: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
};

/** Encoder arguments for a video container; crf: lower = better. */
export const videoCodecArgs = (format: VideoFormat, crf: number, withAudio = true): string[] => {
  const q = String(Math.round(crf));
  if (format === 'webm') {
    // ponytail: VP8, libvpx-vp9 in core 0.12.6 crashes on the first inter frame; retry VP9 on a newer core
    // -crf sets the quality, -b:v is only its ceiling; realtime/cpu-used 8 are the fastest settings for WASM.
    // Vorbis, not Opus: libopus crashes (memory access out of bounds) when fed from a -filter_complex graph
    return ['-c:v', 'libvpx', '-crf', q, '-b:v', '8M', '-deadline', 'realtime', '-cpu-used', '8',
      ...(withAudio ? ['-c:a', 'libvorbis'] : ['-an'])];
  }
  // MP4 (default), MOV and AVI all use H.264 + AAC
  return ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', q,
    ...(withAudio ? ['-c:a', 'aac'] : ['-an']),
    ...(format === 'avi' ? [] : ['-movflags', '+faststart'])];
};

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'flac' | 'm4a';

export const AUDIO_MIME: Record<AudioFormat, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
};

/** Encoder arguments for an audio file; kbps applies to the lossy formats. */
export const audioCodecArgs = (format: AudioFormat, kbps = 192): string[] => {
  switch (format) {
    case 'mp3': return ['-c:a', 'libmp3lame', '-b:a', `${kbps}k`];
    case 'ogg': return ['-c:a', 'libvorbis', '-b:a', `${kbps}k`];
    case 'flac': return ['-c:a', 'flac'];
    case 'm4a': return ['-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart'];
    case 'wav': return ['-c:a', 'pcm_s16le'];
  }
};
