
import { ConversionOptions } from '@/types';
import { config } from '@/config';
import 'gif.js/dist/gif.js';
// GIF is now available as a global
declare global {
  interface Window {
    GIF: any;
    gc?: () => void; // Optional garbage collection function
  }
}
const GIF = (window as any).GIF;

// Enhanced error handling for GIF conversion
class GifConversionError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'GifConversionError';
  }
}

// Enhanced progress interface
interface EnhancedProgress {
  stage: 'loading' | 'processing' | 'encoding' | 'complete';
  progress: number;
  message: string;
  frameCount?: number;
  totalFrames?: number;
}

type EnhancedProgressCallback = (progress: EnhancedProgress) => void;

// Load GIF constructor
const loadGifJs = async () => {
  if (!GIF || typeof GIF !== 'function') {
    throw new GifConversionError('GIF constructor is not available or not a function', 'loading');
  }
  return GIF;
};

// Export the error class for external use
export { GifConversionError, type EnhancedProgress, type EnhancedProgressCallback };

export const convertVideoToGif = async (
  videoFile: File,
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void | EnhancedProgressCallback
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
    let GIF: any;
    try {
      GIF = await loadGifJs();
      
      if (!GIF) {
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
          
          // Use the statically imported GIF constructor
          if (typeof GIF !== 'function') {
            throw new GifConversionError('GIF constructor not available', 'processing');
          }
          
          console.log(`Creating GIF encoder: ${workerCount} workers, ${estimatedFrames} frames, ${targetWidth}x${targetHeight}`);
          
          const gif = new GIF({
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
          
          console.log(`Dynamic timeout calculated: ${WORKER_TIMEOUT}ms for ${estimatedFrames} frames (${videoDuration.toFixed(2)}s duration)`);

          // Cleanup function with worker termination
          const cleanupResources = () => {
            // Critical fix: Clear worker timeout
            if (workerTimeout) {
              clearTimeout(workerTimeout);
              workerTimeout = null;
            }
            
            // Critical fix: Explicitly terminate workers
            try {
              if (gif && typeof gif.freeWorkers === 'function') {
                gif.freeWorkers();
              }
              if (gif && typeof gif.abort === 'function') {
                gif.abort();
              }
            } catch (error) {
              console.warn('Worker cleanup warning:', error);
            }
            
            if (video) {
              video.pause();
              video.removeAttribute('src');
              video.load();
              if (video.src) {
                URL.revokeObjectURL(video.src);
              }
              video = null;
            }
            if (canvas) {
              canvas.width = 0;
              canvas.height = 0;
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
            if (processingBatch || !video || !ctx || video.currentTime >= actualEndTime) {
              if (!processingBatch && frameCount > 0 && !isRendering) {
                isRendering = true;
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                gif.render();
              }
              return;
            }
            
            processingBatch = true;
            
            try {
              // Process frames in batches with memory management
              for (let i = 0; i < batchSize && video.currentTime < actualEndTime; i++) {
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / fps) });
                
                frameCount++;
                const progress = 40 + (frameCount / totalFrames) * 40;
                enhancedProgress('processing', progress, `Processing frame ${frameCount}/${totalFrames}...`, {
                  frameCount,
                  totalFrames
                });
                
                // Move to next frame
                video.currentTime += 1 / fps;
                
                // Memory management: Force garbage collection every 20 frames
                if (frameCount % 20 === 0 && window.gc) {
                  window.gc();
                }
                
                // Yield to main thread within batch
                if (i < batchSize - 1) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
              
              processingBatch = false;
              
              // Continue with next batch
              if (video.currentTime < actualEndTime) {
                // Yield to main thread between batches
                setTimeout(captureFrame, 10);
              } else if (!isRendering) {
                isRendering = true;
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                gif.render();
              }
              
            } catch (error) {
              processingBatch = false;
              console.warn('Frame capture error:', error);
              // Continue with next frame
              setTimeout(captureFrame, 10);
            }
          };
          
          video.onseeked = captureFrame;
          
          // Start capturing from the start time
          video.currentTime = actualStartTime;
        };
    
        video.onerror = () => {
          clearTimeout(loadTimeout);
          cleanupResources();
          reject(new GifConversionError('Error loading video', 'loading'));
        };
        
        // Set video source
        video.src = URL.createObjectURL(videoFile);
    });
  } catch (error) {
    throw error;
  }
};
