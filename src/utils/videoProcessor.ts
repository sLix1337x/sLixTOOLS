import { VIDEO_MIME, type VideoFormat, videoCodecArgs, withFFmpeg } from './ffmpeg';
import { getFileExtension } from './fileValidation';

export interface VideoCompressionOptions {
  quality: number; // CRF passed straight to the encoder (lower = better, UI 18-35)
  maxWidth: number;
  maxHeight: number;
  format: VideoFormat;
  fps?: number;
  maintainAspectRatio: boolean;
}

export interface ProcessingProgress {
  progress: number; // 0-100
}

const MAX_INPUT_SIZE = 500 * 1024 * 1024;

/** Re-encodes a video into options.format, fitted into the max size. */
export const compressVideo = async (
  videoFile: File,
  options: VideoCompressionOptions,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  if (videoFile.size > MAX_INPUT_SIZE) {
    throw new Error(`Video file size (${Math.round(videoFile.size / 1024 / 1024)}MB) exceeds the 500MB maximum`);
  }
  onProgress?.({ progress: 0 });

  const inputName = `input.${getFileExtension(videoFile.name) || 'mp4'}`;
  const outputName = `output.${options.format}`;
  const duration = await probeDuration(videoFile);

  const blob = await withFFmpeg(async (ff) => {
    await ff.write(inputName, videoFile);
    const args = ['-i', inputName, '-threads', '1', ...videoCodecArgs(options.format, options.quality)];

    // Resolution: fit within max size, never upscale, keep even dimensions (H.264 needs them).
    // maintainAspectRatio=false scales to the exact size.
    if (options.maxWidth > 0 && options.maxHeight > 0) {
      const W = Math.round(options.maxWidth);
      const H = Math.round(options.maxHeight);
      args.push('-vf', options.maintainAspectRatio
        ? `scale='min(${W},iw)':'min(${H},ih)':force_original_aspect_ratio=decrease:flags=fast_bilinear,scale=trunc(iw/2)*2:trunc(ih/2)*2`
        : `scale=${W - (W % 2)}:${H - (H % 2)}:flags=fast_bilinear`);
    }
    if (options.fps) args.push('-r', String(options.fps));

    await ff.run([...args, outputName], duration || undefined);
    return ff.read(outputName, VIDEO_MIME[options.format]);
  }, (ratio) => onProgress?.({ progress: ratio * 100 }));

  onProgress?.({ progress: 100 });
  return blob;
};

/** Duration in seconds from the browser's own demuxer; 0 when it cannot read the file. */
export const probeDuration = (file: Blob): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    el.src = url;
  });
