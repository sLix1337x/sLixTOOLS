import { getPerformanceMonitor } from './performanceMonitor.tsx';

interface GifCompressionOptions {
  quality: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  frameSkip?: number; // Skip every N frames
  colorReduction?: number; // Reduce color palette
}

interface CompressionProgress {
  stage: 'loading' | 'extracting' | 'compressing' | 'rebuilding' | 'complete';
  progress: number;
  message: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

type ProgressCallback = (progress: CompressionProgress) => void;

class GifCompressionError extends Error {
  constructor(
    message: string,
    public stage: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GifCompressionError';
  }
}

// Dynamic import for GIF.js library
const loadGifJs = async () => {
  try {
    const gifModule = await import('gif.js');
    return gifModule.default || gifModule;
  } catch (error) {
    console.error('Failed to load GIF.js:', error);
    return null;
  }
};

// Extract frames from GIF
const extractGifFrames = async (
  file: File,
  onProgress?: ProgressCallback
): Promise<{ frames: ImageData[]; delays: number[]; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new GifCompressionError('Failed to get canvas context', 'extracting'));
      return;
    }

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // For now, we'll treat it as a single frame
        // In a real implementation, you'd need a GIF parser
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        onProgress?.({
          stage: 'extracting',
          progress: 100,
          message: 'Frames extracted successfully'
        });
        
        resolve({
          frames: [imageData],
          delays: [100], // Default delay
          width: canvas.width,
          height: canvas.height
        });
      } catch (error) {
        reject(new GifCompressionError('Failed to extract frames', 'extracting', error as Error));
      }
    };

    img.onerror = () => {
      reject(new GifCompressionError('Failed to load GIF image', 'loading'));
    };

    img.src = URL.createObjectURL(file);
  });
};

// Compress individual frame
const compressFrame = (
  imageData: ImageData,
  quality: number,
  colorReduction?: number
): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new GifCompressionError('Failed to get canvas context', 'compressing');
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  // Apply quality reduction by re-encoding
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new GifCompressionError('Failed to get temp canvas context', 'compressing');
  }

  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  
  // Draw with quality reduction
  tempCtx.imageSmoothingEnabled = quality < 80;
  tempCtx.imageSmoothingQuality = quality > 80 ? 'high' : quality > 50 ? 'medium' : 'low';
  tempCtx.drawImage(canvas, 0, 0);

  // Apply color reduction if specified
  if (colorReduction && colorReduction < 256) {
    const compressedImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = compressedImageData.data;
    
    // Simple color quantization
    const factor = Math.floor(256 / colorReduction);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / factor) * factor;     // Red
      data[i + 1] = Math.floor(data[i + 1] / factor) * factor; // Green
      data[i + 2] = Math.floor(data[i + 2] / factor) * factor; // Blue
    }
    
    tempCtx.putImageData(compressedImageData, 0, 0);
  }

  return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
};

// Main compression function
export const compressGif = async (
  file: File,
  options: GifCompressionOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  monitor.startOperation('gifCompression');

  try {
    const {
      quality = 80,
      maxWidth,
      maxHeight,
      frameSkip = 0,
      colorReduction
    } = options;

    onProgress?.({
      stage: 'loading',
      progress: 0,
      message: 'Loading GIF library...',
      originalSize: file.size
    });

    // Load GIF.js library
    const GIF = await loadGifJs();
    if (!GIF) {
      throw new GifCompressionError('Failed to load GIF processing library', 'loading');
    }

    onProgress?.({
      stage: 'extracting',
      progress: 20,
      message: 'Extracting frames...'
    });

    // Extract frames from the original GIF
    const { frames, delays, width, height } = await extractGifFrames(file, onProgress);

    onProgress?.({
      stage: 'compressing',
      progress: 40,
      message: 'Compressing frames...'
    });

    // Calculate target dimensions
    let targetWidth = width;
    let targetHeight = height;

    if (maxWidth && targetWidth > maxWidth) {
      targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
      targetWidth = maxWidth;
    }

    if (maxHeight && targetHeight > maxHeight) {
      targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
      targetHeight = maxHeight;
    }

    // Ensure even dimensions for better encoding
    targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
    targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

    onProgress?.({
      stage: 'rebuilding',
      progress: 60,
      message: 'Rebuilding GIF...'
    });

    return new Promise((resolve, reject) => {
      // Create new GIF encoder
      const gif = new (GIF as new (options: { workers: number; quality: number; width: number; height: number; dither: string | boolean; globalPalette: boolean; repeat: number }) => { addFrame: (canvas: HTMLCanvasElement, options: { delay: number }) => void; on: (event: string, callback: (blob: Blob) => void) => void; render: () => void })({
        workers: Math.min(navigator.hardwareConcurrency || 2, 4),
        quality: Math.max(1, Math.min(30, 31 - Math.floor(quality / 3.33))),
        width: targetWidth,
        height: targetHeight,
        dither: quality > 70 ? 'FloydSteinberg' : false,
        globalPalette: true,
        repeat: 0
      });

      // Process and add frames
      frames.forEach((frame, index) => {
        // Skip frames if frameSkip is specified
        if (frameSkip > 0 && index % (frameSkip + 1) !== 0) {
          return;
        }

        try {
          // Compress the frame
          const compressedFrame = compressFrame(frame, quality, colorReduction);
          
          // Resize if needed
          if (targetWidth !== width || targetHeight !== height) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              
              // Create temporary canvas with original frame
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCtx.putImageData(compressedFrame, 0, 0);
                
                // Draw resized
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
                
                gif.addFrame(ctx, { delay: delays[index] || 100 });
              }
            }
          } else {
            // Use original size
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              ctx.putImageData(compressedFrame, 0, 0);
              gif.addFrame(ctx, { delay: delays[index] || 100 });
            }
          }
        } catch (error) {
          console.warn('Failed to process frame', index, error);
        }
      });

      gif.on('finished', (blob: Blob) => {
        const compressionRatio = ((file.size - blob.size) / file.size) * 100;
        
        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'Compression complete!',
          originalSize: file.size,
          compressedSize: blob.size,
          compressionRatio
        });

        monitor.endOperation('gifCompression');
        resolve(blob);
      });

      gif.on('error', (error: Error) => {
        monitor.endOperation('gifCompression');
        reject(new GifCompressionError('GIF encoding failed', 'rebuilding', error));
      });

      gif.on('progress', (progress: number) => {
        onProgress?.({
          stage: 'rebuilding',
          progress: 60 + (progress * 0.4),
          message: `Encoding GIF... ${Math.round(progress * 100)}%`
        });
      });

      // Start rendering
      gif.render();
    });

  } catch (error) {
    monitor.endOperation('gifCompression');
    throw error instanceof GifCompressionError ? error : 
      new GifCompressionError('Compression failed', 'unknown', error as Error);
  }
};

// Utility function to get optimal compression settings
export const getOptimalCompressionSettings = (fileSize: number): GifCompressionOptions => {
  const sizeMB = fileSize / (1024 * 1024);
  
  let quality = 80;
  let frameSkip = 0;
  let colorReduction = undefined;
  
  if (sizeMB > 10) {
    quality = 60;
    frameSkip = 1; // Skip every other frame
    colorReduction = 128;
  } else if (sizeMB > 5) {
    quality = 70;
    frameSkip = 0;
    colorReduction = 192;
  } else if (sizeMB > 2) {
    quality = 75;
  }
  
  return {
    quality,
    frameSkip,
    colorReduction,
    maxWidth: sizeMB > 5 ? 800 : undefined,
    maxHeight: sizeMB > 5 ? 600 : undefined
  };
};

// Export types and error class
export {
  GifCompressionError,
  type GifCompressionOptions,
  type CompressionProgress,
  type ProgressCallback
};