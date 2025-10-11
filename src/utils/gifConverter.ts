
import { ConversionOptions } from '../types';
import 'gif.js/dist/gif.js';

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

// Type-safe GIF constructor access with proper validation
const getGifConstructor = (): GifJsConstructor | null => {
  const globalWindow = window as Window & { GIF?: GifJsConstructor };
  const GifConstructor = globalWindow.GIF;
  
  // Validate that GIF constructor exists and is a function
  if (!GifConstructor || typeof GifConstructor !== 'function') {
    return null;
  }
  
  // Additional validation to ensure it's the correct constructor
  try {
    // Test instantiation with minimal options to verify it's working
    const testInstance = new GifConstructor({ 
      workers: 1, 
      quality: 10, 
      width: 100, 
      height: 100,
      workerScript: '/workers/gif.worker.js'
    });
    if (testInstance && typeof testInstance.addFrame === 'function') {
      return GifConstructor;
    }
  } catch {
    return null;
  }
  
  return null;
};

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
    
        // Add timeout for video loading
        const loadTimeout = setTimeout(() => {
          reject(new GifConversionError('Video load timeout', 'loading'));
        }, 30000);

        // Setup video metadata loading
        video.onloadedmetadata = () => {
          clearTimeout(loadTimeout);
          
          // Validate video properties
          if (!video!.videoWidth || !video!.videoHeight || !video!.duration) {
            reject(new GifConversionError('Invalid video file or corrupted metadata', 'loading'));
            return;
          }
          
          // Calculate actual start and end times
          const actualStartTime = trimEnabled ? Math.min(startTime, video!.duration) : 0;
          const actualEndTime = trimEnabled && duration 
            ? Math.min(actualStartTime + duration, video!.duration) 
            : video!.duration;
          
          // Calculate video duration and estimated frames early
          const videoDuration = actualEndTime - actualStartTime;
          const estimatedFrames = Math.ceil(videoDuration * fps);
          
          // Calculate optimized dimensions
          const maxDimension = 800; // Limit for performance
          let targetWidth = width || video!.videoWidth;
          let targetHeight = height || video!.videoHeight;
          
          // Scale down if too large
          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            const aspectRatio = video!.videoWidth / video!.videoHeight;
            if (targetWidth > targetHeight) {
              targetWidth = maxDimension;
              targetHeight = Math.round(maxDimension / aspectRatio);
            } else {
              targetHeight = maxDimension;
              targetWidth = Math.round(maxDimension * aspectRatio);
            }
          }
          
          // Ensure dimensions are even numbers (better for encoding)
          targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
          targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
          
          canvas!.width = targetWidth;
          canvas!.height = targetHeight;
          
          enhancedProgress('processing', 30, 'Setting up GIF encoder...');
      
          // Create GIF encoder with optimized settings for performance
          // Optimize worker count based on file complexity
          const baseWorkerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
          const workerCount = estimatedFrames > 100 ? Math.min(baseWorkerCount, 2) : baseWorkerCount;
          
          // Use the type-safe GIF constructor
          if (typeof GifConstructor !== 'function') {
            throw new GifConversionError('GIF constructor not available', 'processing');
          }
          
          const gif = new GifConstructor({
            workers: workerCount,
            quality: Math.max(1, Math.min(30, quality)),
            width: targetWidth,
            height: targetHeight,
            workerScript: '/workers/gif.worker.js',
            dither: quality > 20 ? 'FloydSteinberg' : false,
            globalPalette: estimatedFrames > 50, // Use global palette for longer videos
            optimizeTransparency: true,
            repeat: 0, // Loop forever
            background: '#ffffff'
          });
          
          // Critical fix: Add worker termination timeout with dynamic calculation
          let workerTimeout: NodeJS.Timeout | null = null;
          // Calculate timeout based on video duration, FPS, and quality
          // Base timeout: 5 seconds per frame + 30 seconds buffer
          const WORKER_TIMEOUT = Math.max(120000, estimatedFrames * 5000 + 30000); // Minimum 2 minutes

          // Cleanup function with worker termination
          const cleanupResources = () => {
            // Critical fix: Clear worker timeout
            if (workerTimeout) {
              clearTimeout(workerTimeout);
              workerTimeout = null;
            }
            
            // Critical fix: Explicitly terminate workers with proper error handling
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
            
            // Enhanced video cleanup with null checks
            if (video) {
              try {
                video.pause();
                video.removeAttribute('src');
                video.load();
                const videoSrc = video.src;
                if (videoSrc && videoSrc.startsWith('blob:')) {
                  URL.revokeObjectURL(videoSrc);
                }
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (_error) {
                // Video cleanup handled silently
              }
              video = null;
            }
            
            // Enhanced canvas cleanup with null checks
            if (canvas) {
              try {
                canvas.width = 0;
                canvas.height = 0;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (_error) {
                // Canvas cleanup handled silently
              }
              canvas = null;
            }
            ctx = null;
          };

          // Critical fix: Set worker timeout
          workerTimeout = setTimeout(() => {
            cleanupResources();
            reject(new GifConversionError('Worker timeout - processing took too long', 'encoding'));
          }, WORKER_TIMEOUT);

          // When GIF is finished
          gif.on('finished', (blob: Blob) => {
            enhancedProgress('complete', 100, 'GIF conversion complete!');
            

            
            // Clean up
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
            if (workerTimeout) {
              clearTimeout(workerTimeout);
              workerTimeout = setTimeout(() => {
                cleanupResources();
                reject(new GifConversionError('Worker timeout - processing took too long', 'encoding'));
              }, WORKER_TIMEOUT);
            }
          });
          
          // Enhanced frame capture with batching
          let frameCount = 0;
          const totalFrames = Math.ceil((actualEndTime - actualStartTime) * fps);
          const batchSize = Math.min(5, Math.max(1, Math.floor(30 / fps))); // Adaptive batch size
          let processingBatch = false;
          let isRendering = false; // Prevent multiple render calls
          
          enhancedProgress('processing', 40, 'Capturing video frames...', { frameCount: 0, totalFrames });
          
          const captureFrame = async () => {
            if (processingBatch || !video || !ctx || !canvas || video.currentTime >= actualEndTime) {
              if (!processingBatch && frameCount > 0 && !isRendering) {
                isRendering = true;
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                try {
                  gif.render();
                } catch (error) {
                  cleanupResources();
                  reject(new GifConversionError('Failed to start GIF rendering', 'encoding', error as Error));
                  return;
                }
              }
              return;
            }
            
            processingBatch = true;
            
            try {
              // Process frames in batches with memory management
              for (let i = 0; i < batchSize && video && video.currentTime < actualEndTime; i++) {
                // Additional null checks before drawing
                if (!video || !ctx || !canvas) {
                  throw new Error('Video, context, or canvas became null during processing');
                }
                
                // Validate video state before drawing
                if (video.readyState < 2) { // HAVE_CURRENT_DATA
                  // Video not ready for frame capture, skipping frame
                  continue;
                }
                
                try {
                  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                  gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / fps) });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_drawError) {
                  // Frame drawing error handled silently
                  // Skip this frame and continue
                  video.currentTime += 1 / fps;
                  continue;
                }
                
                frameCount++;
                const progress = 40 + (frameCount / totalFrames) * 40;
                enhancedProgress('processing', progress, `Processing frame ${frameCount}/${totalFrames}...`, {
                  frameCount,
                  totalFrames
                });
                
                // Move to next frame with bounds checking
                const nextTime = video.currentTime + (1 / fps);
                if (nextTime <= actualEndTime) {
                  video.currentTime = nextTime;
                } else {
                  break; // End of processing
                }
                
                // Memory management: Force garbage collection every 20 frames
                if (frameCount % 20 === 0 && window.gc) {
                  try {
                    window.gc();
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  } catch (_gcError) {
                    // Garbage collection handled silently
                  }
                }
                
                // Yield to main thread within batch
                if (i < batchSize - 1) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
              
              processingBatch = false;
              
              // Continue with next batch
              if (video && video.currentTime < actualEndTime) {
                // Yield to main thread between batches
                setTimeout(captureFrame, 10);
              } else if (!isRendering && frameCount > 0) {
                isRendering = true;
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                try {
                  gif.render();
                } catch (error) {
                  cleanupResources();
                  reject(new GifConversionError('Failed to start GIF rendering', 'encoding', error as Error));
                  return;
                }
              }
              
            } catch (error) {
              processingBatch = false;
              // Frame capture error handled silently
              
              // Enhanced error recovery
              if (frameCount === 0) {
                // If no frames captured yet, this is a critical error
                cleanupResources();
                reject(new GifConversionError('Failed to capture any frames from video', 'processing', error as Error));
                return;
              }
              
              // If we have some frames, try to continue or finish
              if (video && video.currentTime < actualEndTime) {
                // Try to continue with next frame after a delay
                setTimeout(captureFrame, 50);
              } else if (!isRendering && frameCount > 0) {
                // Finish with what we have
                isRendering = true;
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                try {
                  gif.render();
                } catch (renderError) {
                  cleanupResources();
                  reject(new GifConversionError('Failed to start GIF rendering', 'encoding', renderError as Error));
                }
              }
            }
          };
          
          if (video) {
            video.onseeked = () => {
              // Add null checks before calling captureFrame
              if (video && ctx && canvas) {
                captureFrame();
              } else {
                cleanupResources();
                reject(new GifConversionError('Video, context, or canvas became null during seeking', 'processing'));
              }
            };
          }
          
          // Start capturing from the start time with error handling
          try {
            if (video) {
              video.currentTime = actualStartTime;
            }
          } catch (seekError) {
            cleanupResources();
            reject(new GifConversionError('Failed to seek to start time', 'processing', seekError as Error));
          }
        };
    
        video.onerror = () => {
          clearTimeout(loadTimeout);
          // Cleanup resources directly since cleanupResources is not in scope
          if (video) {
            video.src = '';
            video.load();
          }
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
          const errorMessage = video?.error?.message || 'Unknown video error';
          reject(new GifConversionError(`Error loading video: ${errorMessage}`, 'loading'));
        };
        
        // Set video source with error handling
        try {
          video.src = URL.createObjectURL(videoFile);
        } catch (error) {
          // Cleanup resources directly since cleanupResources is not in scope
          if (video) {
            video.src = '';
            video.load();
          }
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
          reject(new GifConversionError('Failed to create video URL', 'loading', error as Error));
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
