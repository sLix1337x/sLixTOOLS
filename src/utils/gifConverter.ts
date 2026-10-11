
import { ConversionOptions } from '../types';
import GIFLib from 'gif.js';
import { config } from '../config';

// Proper TypeScript interfaces for GIF.js library
interface GifJsOptions {
  workers: number;
  quality: number;
  width: number;
  height: number;
  workerScript: string;
  dither?: string | boolean | undefined;
  globalPalette?: boolean | undefined;
  optimizeTransparency?: boolean | undefined;
  repeat?: number | undefined;
  background?: string | undefined;
  transparent?: string | null | undefined;
  debug?: boolean | undefined;
}

interface GifJsInstance {
  addFrame(canvas: HTMLCanvasElement | CanvasRenderingContext2D, options?: { delay?: number | undefined; copy?: boolean | undefined } | undefined): void;
  render(): void;
  abort(): void;
  freeWorkers(): void;
  on(event: 'finished', callback: (blob: Blob) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'progress', callback: (progress: number) => void): void;
  on(event: 'abort', callback: () => void): void;
  on(event: string, callback: (data: unknown) => void): void;
}

interface GifJsConstructor {
  new (options: GifJsOptions): GifJsInstance;
}

// Enhanced global window interface
declare global {
  interface Window {
    GIF: GifJsConstructor;
    gc?: () => void; // Optional garbage collection function
  }
}

// gif.js is UMD: bundled via module.exports, it never sets window.GIF
const getGifConstructor = (): GifJsConstructor | null =>
  (GIFLib as unknown as GifJsConstructor) ?? null;

// Enhanced error handling for GIF conversion
class GifConversionError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error | undefined) {
    super(message);
    this.name = 'GifConversionError';
  }
}

// Enhanced progress interface
interface EnhancedProgress {
  stage: 'loading' | 'processing' | 'encoding' | 'complete';
  progress: number;
  message: string;
  frameCount?: number | undefined;
  totalFrames?: number | undefined;
}

type EnhancedProgressCallback = (progress: EnhancedProgress) => void;

// Load GIF constructor
const loadGifJs = async (): Promise<GifJsConstructor> => {
  const GifConstructor = getGifConstructor();
  if (!GifConstructor || typeof GifConstructor !== 'function') {
    throw new GifConversionError('GIF constructor is not available or not a function', 'loading');
  }
  return GifConstructor;
};

// Export the error class for external use
export { GifConversionError, type EnhancedProgress, type EnhancedProgressCallback };

// setTimeout treats delays above 2^31-1 (or Infinity) as 0
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

// One timestamp per output frame: start + i/fps while the frame fits before end
export const getFrameTimes = (start: number, end: number, fps: number): number[] => {
  const times: number[] = [];
  for (let i = 0; start + (i + 1) / fps <= end + 1e-6; i++) {
    times.push(start + i / fps);
  }
  return times;
};

// Output size: unset/non-positive sides are auto, a single side keeps the source aspect
// ratio, result fits maxDimension and both sides are even and >= 2
export const getGifDimensions = (
  sourceWidth: number,
  sourceHeight: number,
  width?: number,
  height?: number,
  maxDimension = 800
): { width: number; height: number } => {
  const aspectRatio = sourceWidth / sourceHeight;
  const w = width && width > 0 ? width : undefined;
  const h = height && height > 0 ? height : undefined;
  let targetWidth = w ?? (h ? h * aspectRatio : sourceWidth);
  let targetHeight = h ?? (w ? w / aspectRatio : sourceHeight);

  const scale = maxDimension / Math.max(targetWidth, targetHeight);
  if (scale < 1) {
    targetWidth *= scale;
    targetHeight *= scale;
  }

  const even = (n: number) => Math.max(2, Math.floor(Math.round(n) / 2) * 2);
  return { width: even(targetWidth), height: even(targetHeight) };
};

export const convertVideoToGif = async (
  videoFile: File,
  options: Partial<ConversionOptions> = {},
  onProgress?: ((progress: number) => void) | EnhancedProgressCallback
): Promise<Blob> => {
  
  let video: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  
  const enhancedProgress = (stage: EnhancedProgress['stage'], progress: number, message: string, extra?: Partial<EnhancedProgress>) => {
    if (typeof onProgress === 'function') {
      // Check if it's the enhanced callback
      if (onProgress.length > 1 || stage !== 'processing') {
        (onProgress as EnhancedProgressCallback)({ stage, progress, message, ...extra });
      } else {
        // Legacy callback
        (onProgress as (progress: number) => void)(progress / 100);
      }
    }
  };
  
  try {
    const {
      fps = 10,
      quality = 10,
      width,
      height,
      startTime = 0,
      duration,
      trimEnabled = false,
    } = options;

    enhancedProgress('loading', 0, 'Loading GIF library...');

    // Load GIF.js dynamically with enhanced error handling
    let GifConstructor: GifJsConstructor;
    try {
      GifConstructor = await loadGifJs();
      
      if (!GifConstructor) {
        throw new GifConversionError('Failed to load GIF processing library', 'loading');
      }
    } catch (error) {
      if (error instanceof GifConversionError) {
        throw error;
      }
      throw new GifConversionError('Failed to load GIF processing library', 'loading', error as Error);
    }
    
    enhancedProgress('loading', 20, 'Initializing video processing...');

    return new Promise((resolve, reject) => {
        // Create video element to extract frames
        video = document.createElement('video');
        video.muted = true;
        video.autoplay = false;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        let videoUrl = '';

        // Create canvas to draw video frames with optimized context
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', {
          alpha: false, // Disable alpha for better performance
          willReadFrequently: true
        });

        if (!ctx) {
          reject(new GifConversionError('Failed to get canvas context', 'loading'));
          return;
        }

        // Unload the video, revoke its object URL and free the canvas
        const releaseVideo = () => {
          if (video) {
            try {
              video.pause();
              video.removeAttribute('src');
              video.load();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_error) {
              // Video cleanup handled silently
            }
            video = null;
          }
          if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            videoUrl = '';
          }
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
            canvas = null;
          }
          ctx = null;
        };

        const fail = (error: GifConversionError) => {
          releaseVideo();
          reject(error);
        };

        // Add timeout for video loading
        const loadTimeout = setTimeout(() => {
          fail(new GifConversionError('Video load timeout', 'loading'));
        }, 30000);

        // Setup video metadata loading
        video.onloadedmetadata = () => {
          clearTimeout(loadTimeout);

          // Validate video properties
          if (!video!.videoWidth || !video!.videoHeight || !video!.duration) {
            fail(new GifConversionError('Invalid video file or corrupted metadata', 'loading'));
            return;
          }

          // MediaRecorder WebM files often report Infinity until fully scanned
          if (!Number.isFinite(video!.duration)) {
            fail(new GifConversionError('Video duration is unknown (common with recorded WebM files). Re-save or convert the video and try again.', 'loading'));
            return;
          }

          // Calculate actual start and end times
          const actualStartTime = trimEnabled ? Math.max(0, Math.min(startTime, video!.duration)) : 0;
          const actualEndTime = trimEnabled && duration
            ? Math.min(actualStartTime + duration, video!.duration)
            : video!.duration;

          const frameTimes = getFrameTimes(actualStartTime, actualEndTime, fps);
          const totalFrames = frameTimes.length;

          if (totalFrames === 0) {
            fail(new GifConversionError(`Selected range is empty or shorter than one frame (start ${actualStartTime.toFixed(2)}s, end ${actualEndTime.toFixed(2)}s). Check the start and end times.`, 'processing'));
            return;
          }

          const maxFrames = Math.floor(config.gif.maxDuration * fps);
          if (totalFrames > maxFrames) {
            fail(new GifConversionError(`Clip is too long: ${(actualEndTime - actualStartTime).toFixed(1)}s at ${fps} FPS. GIFs are limited to ${config.gif.maxDuration}s; trim the video or lower the FPS.`, 'processing'));
            return;
          }

          // Calculate optimized dimensions (limit 800px for performance)
          const { width: targetWidth, height: targetHeight } = getGifDimensions(
            video!.videoWidth,
            video!.videoHeight,
            width,
            height
          );

          canvas!.width = targetWidth;
          canvas!.height = targetHeight;

          enhancedProgress('processing', 30, 'Setting up GIF encoder...');

          // Create GIF encoder with optimized settings for performance
          // Optimize worker count based on file complexity
          const baseWorkerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
          const workerCount = totalFrames > 100 ? Math.min(baseWorkerCount, 2) : baseWorkerCount;

          const gif = new GifConstructor({
            workers: workerCount,
            quality: Math.max(1, Math.min(30, quality)),
            width: targetWidth,
            height: targetHeight,
            workerScript: config.gif.workerPath,
            dither: quality > 20 ? 'FloydSteinberg' : false,
            globalPalette: totalFrames > 50, // Use global palette for longer videos
            optimizeTransparency: true,
            repeat: 0, // Loop forever
            background: '#ffffff'
          });

          let workerTimeout: ReturnType<typeof setTimeout> | null = null;
          // 5 seconds per frame + 30 seconds buffer, minimum 2 minutes
          const WORKER_TIMEOUT = Math.min(MAX_TIMEOUT_MS, Math.max(120000, totalFrames * 5000 + 30000));

          // Cleanup function with worker termination
          const cleanupResources = () => {
            if (workerTimeout) {
              clearTimeout(workerTimeout);
              workerTimeout = null;
            }

            try {
              if (gif && typeof gif.freeWorkers === 'function') {
                gif.freeWorkers();
              }
              if (gif && typeof gif.abort === 'function') {
                gif.abort();
              }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_error) {
              // Worker cleanup handled silently
            }

            releaseVideo();
          };

          const startWorkerTimeout = () => {
            if (workerTimeout) clearTimeout(workerTimeout);
            workerTimeout = setTimeout(() => {
              cleanupResources();
              reject(new GifConversionError('Worker timeout - processing took too long', 'encoding'));
            }, WORKER_TIMEOUT);
          };
          startWorkerTimeout();

          // When GIF is finished
          gif.on('finished', (blob: Blob) => {
            enhancedProgress('complete', 100, 'GIF conversion complete!');
            cleanupResources();
            resolve(blob);
          });

          gif.on('error', (error: Error) => {
            cleanupResources();
            reject(new GifConversionError('GIF encoding failed', 'encoding', error));
          });

          gif.on('progress', (progress: number) => {
            const encodingProgress = 80 + (progress * 20);
            enhancedProgress('encoding', encodingProgress, `Encoding... ${Math.round(progress * 100)}%`);
            // Reset timeout when progress is made
            startWorkerTimeout();
          });

          enhancedProgress('processing', 40, 'Capturing video frames...', { frameCount: 0, totalFrames });

          // Seek to each frame time, capture exactly one frame per completed seek, then render
          const frameDelay = Math.round(1000 / fps);
          const captureFrames = async () => {
            for (let i = 0; i < totalFrames; i++) {
              const v = video;
              if (!v) return; // Cleaned up (timeout)
              await new Promise<void>((resolveSeek) => {
                v.onseeked = () => resolveSeek();
                v.currentTime = frameTimes[i];
              });
              if (!video || !ctx) return;

              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              gif.addFrame(ctx, { copy: true, delay: frameDelay });

              const frameCount = i + 1;
              enhancedProgress('processing', 40 + (frameCount / totalFrames) * 40, `Processing frame ${frameCount}/${totalFrames}...`, {
                frameCount,
                totalFrames
              });
            }

            enhancedProgress('encoding', 80, 'Encoding GIF...');
            gif.render();
          };

          captureFrames().catch((error) => {
            cleanupResources();
            reject(new GifConversionError('Failed to capture frames from video', 'processing', error as Error));
          });
        };

        video.onerror = () => {
          clearTimeout(loadTimeout);
          const errorMessage = video?.error?.message || 'Unknown video error';
          fail(new GifConversionError(`Error loading video: ${errorMessage}`, 'loading'));
        };

        // Set video source with error handling
        try {
          videoUrl = URL.createObjectURL(videoFile);
          video.src = videoUrl;
        } catch (error) {
          clearTimeout(loadTimeout);
          fail(new GifConversionError('Failed to create video URL', 'loading', error as Error));
        }
    });
  } catch (error) {
    // Re-throw GifConversionError as-is, wrap others
    if (error instanceof GifConversionError) {
      throw error;
    }
    throw new GifConversionError('Unexpected error during GIF conversion', 'unknown', error as Error);
  }
};
