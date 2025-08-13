
import { ConversionOptions } from '@/types';
import { config } from '@/config';
import { getPerformanceMonitor } from './performanceMonitor.tsx';

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

// Dynamic import for gif.js with fallback
const loadGifJs = async () => {
  try {
    return await import('gif.js');
  } catch (error) {
    throw new GifConversionError('Failed to load GIF.js library', 'loading', error as Error);
  }
};

// Export the error class for external use
export { GifConversionError, type EnhancedProgress, type EnhancedProgressCallback };

export const convertVideoToGif = async (
  videoFile: File,
  options: ConversionOptions = {},
  onProgress?: (progress: number) => void | EnhancedProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('gifConverter');
  
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

    try {
      // Load GIF.js dynamically with enhanced error handling
      const GIF = await loadGifJs();
      
      if (!GIF) {
        throw new GifConversionError('Failed to load GIF processing library', 'loading');
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
      
          // Create GIF encoder with optimized settings
          const workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
          const gif = new (GIF as { default: new (options: { workers: number; quality: number; width: number; height: number; workerScript: string; dither: string | boolean; globalPalette: boolean; repeat: number }) => { addFrame: (canvas: HTMLCanvasElement, options: { delay: number }) => void; on: (event: string, callback: (blob: Blob) => void) => void; render: () => void } }).default({
            workers: workerCount,
            quality: Math.max(1, Math.min(30, quality)),
            width: targetWidth,
            height: targetHeight,
            workerScript: '/workers/gif.worker.js',
            dither: quality > 20 ? 'FloydSteinberg' : false,
            globalPalette: true,
            optimizeTransparency: true,
            repeat: 0, // Loop forever
            background: '#ffffff'
          });

          // Cleanup function
          const cleanupResources = () => {
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

          // When GIF is finished
          gif.on('finished', (blob: Blob) => {
            enhancedProgress('complete', 100, 'GIF conversion complete!');
            
            // Track memory usage
            monitor.trackMemoryUsage('gifConverter');
            
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
          });
          
          // Enhanced frame capture with batching
          let frameCount = 0;
          const totalFrames = Math.ceil((actualEndTime - actualStartTime) * fps);
          const batchSize = Math.min(5, Math.max(1, Math.floor(30 / fps))); // Adaptive batch size
          let processingBatch = false;
          
          enhancedProgress('processing', 40, 'Capturing video frames...', { frameCount: 0, totalFrames });
          
          const captureFrame = async () => {
            if (processingBatch || !video || !ctx || video.currentTime >= actualEndTime) {
              if (!processingBatch && frameCount > 0) {
                enhancedProgress('encoding', 80, 'Encoding GIF...');
                gif.render();
              }
              return;
            }
            
            processingBatch = true;
            
            try {
              // Process frames in batches
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
              } else {
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
      console.error('GIF conversion failed:', error);
      
      if (error instanceof GifConversionError) {
        throw error;
      }
      
      throw new GifConversionError(
        `Unexpected error during conversion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        error instanceof Error ? error : undefined
      );
    }
  } catch (error) {
    console.error('GIF conversion setup failed:', error);
    throw error;
  } finally {
    endRender();
  }
};
