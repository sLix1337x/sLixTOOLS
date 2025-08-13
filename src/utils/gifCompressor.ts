import { ConversionOptions } from '@/types';
import { config } from '@/config';
import 'gif.js/dist/gif.js';
// GIF is now available as a global
const GIF = (window as any).GIF;

interface GifCompressionOptions {
  quality: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  frameSkip?: number; // Skip every N frames
  colorReduction?: number; // Reduce color palette
  compressionMethod?: 'standard' | 'gifsicle' | 'lossy'; // Compression algorithm
  lossyLevel?: number; // 0-200 for lossy compression
  optimizationLevel?: number; // 1-3 for gifsicle optimization
  dithering?: boolean; // Enable/disable dithering
  interlaced?: boolean; // Enable interlaced GIFs
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

// Gifsicle-style compression with advanced optimization
const compressFrameGifsicle = (
  imageData: ImageData,
  quality: number,
  optimizationLevel: number = 2,
  dithering: boolean = true
): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new GifCompressionError('Failed to get canvas context', 'compressing');
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new GifCompressionError('Failed to get temp canvas context', 'compressing');
  }

  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  
  // Gifsicle-style optimization levels
  switch (optimizationLevel) {
    case 1: // Basic optimization
      tempCtx.imageSmoothingEnabled = false;
      break;
    case 2: // Standard optimization
      tempCtx.imageSmoothingEnabled = quality > 70;
      tempCtx.imageSmoothingQuality = 'medium';
      break;
    case 3: // Maximum optimization
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      break;
  }
  
  tempCtx.drawImage(canvas, 0, 0);
  
  const compressedImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = compressedImageData.data;
  
  // Advanced color quantization with dithering
  const colorLevels = Math.max(8, Math.floor(quality * 2.56)); // 8-256 colors
  const factor = 256 / colorLevels;
  
  for (let i = 0; i < data.length; i += 4) {
    if (dithering) {
      // Floyd-Steinberg dithering simulation
      const noise = (Math.random() - 0.5) * factor * 0.5;
      data[i] = Math.max(0, Math.min(255, Math.floor((data[i] + noise) / factor) * factor));
      data[i + 1] = Math.max(0, Math.min(255, Math.floor((data[i + 1] + noise) / factor) * factor));
      data[i + 2] = Math.max(0, Math.min(255, Math.floor((data[i + 2] + noise) / factor) * factor));
    } else {
      data[i] = Math.floor(data[i] / factor) * factor;
      data[i + 1] = Math.floor(data[i + 1] / factor) * factor;
      data[i + 2] = Math.floor(data[i + 2] / factor) * factor;
    }
  }
  
  tempCtx.putImageData(compressedImageData, 0, 0);
  return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
};

// Lossy GIF compression with aggressive optimization
const compressFrameLossy = (
  imageData: ImageData,
  quality: number,
  lossyLevel: number = 80
): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new GifCompressionError('Failed to get canvas context', 'compressing');
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new GifCompressionError('Failed to get temp canvas context', 'compressing');
  }

  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  
  // Aggressive lossy compression
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = lossyLevel > 100 ? 'low' : 'medium';
  
  // Apply blur for lossy effect
  tempCtx.filter = `blur(${Math.max(0, (200 - lossyLevel) / 100)}px)`;
  tempCtx.drawImage(canvas, 0, 0);
  tempCtx.filter = 'none';
  
  const compressedImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = compressedImageData.data;
  
  // Aggressive color reduction for lossy compression
  const colorReduction = Math.max(4, Math.floor(lossyLevel / 4)); // 4-50 colors
  const factor = 256 / colorReduction;
  
  // Add noise reduction for better compression
  for (let i = 0; i < data.length; i += 4) {
    // Quantize colors more aggressively
    data[i] = Math.floor(data[i] / factor) * factor;
    data[i + 1] = Math.floor(data[i + 1] / factor) * factor;
    data[i + 2] = Math.floor(data[i + 2] / factor) * factor;
    
    // Reduce noise in low-contrast areas
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness < 50 || brightness > 200) {
      const reduction = lossyLevel > 150 ? 0.8 : 0.9;
      data[i] = Math.floor(data[i] * reduction);
      data[i + 1] = Math.floor(data[i + 1] * reduction);
      data[i + 2] = Math.floor(data[i + 2] * reduction);
    }
  }
  
  tempCtx.putImageData(compressedImageData, 0, 0);
  return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
};

// Main compression function
export const compressGif = async (
  file: File,
  options: GifCompressionOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  try {
    const {
      quality = 80,
      maxWidth,
      maxHeight,
      frameSkip = 0,
      colorReduction,
      compressionMethod = 'standard',
      lossyLevel = 80,
      optimizationLevel = 2,
      dithering = true,
      interlaced = false
    } = options;

    onProgress?.({
      stage: 'loading',
      progress: 0,
      message: 'Loading GIF library...',
      originalSize: file.size
    });



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
      // Create new GIF encoder with compression-specific settings
      let gifQuality = Math.max(1, Math.min(30, 31 - Math.floor(quality / 3.33)));
      let ditherSetting: string | boolean = false;
      
      // Adjust settings based on compression method
      switch (compressionMethod) {
        case 'gifsicle':
          ditherSetting = dithering ? 'FloydSteinberg' : false;
          gifQuality = Math.max(1, Math.min(30, 31 - Math.floor(quality / 2.5))); // More aggressive
          break;
        case 'lossy':
          ditherSetting = false; // Disable dithering for lossy to reduce artifacts
          gifQuality = Math.max(1, Math.min(30, 31 - Math.floor(quality / 4))); // Very aggressive
          break;
        default:
          ditherSetting = quality > 70 ? 'FloydSteinberg' : false;
          break;
      }
      
      const gif = new GIF({
        workers: Math.min(navigator.hardwareConcurrency || 2, 4),
        quality: gifQuality,
        width: targetWidth,
        height: targetHeight,
        dither: ditherSetting,
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
          // Compress the frame using selected method
          let compressedFrame: ImageData;
          
          switch (compressionMethod) {
            case 'gifsicle':
              compressedFrame = compressFrameGifsicle(frame, quality, optimizationLevel, dithering);
              break;
            case 'lossy':
              compressedFrame = compressFrameLossy(frame, quality, lossyLevel);
              break;
            default:
              compressedFrame = compressFrame(frame, quality, colorReduction);
              break;
          }
          
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

        resolve(blob);
      });

      gif.on('error', (error: Error) => {
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
    throw error instanceof GifCompressionError ? error : 
      new GifCompressionError('Compression failed', 'unknown', error as Error);
  }
};

// Utility function to get optimal compression settings
export const getOptimalCompressionSettings = (fileSize: number, method: 'standard' | 'gifsicle' | 'lossy' = 'standard'): GifCompressionOptions => {
  const sizeMB = fileSize / (1024 * 1024);
  
  let quality = 80;
  let frameSkip = 0;
  let colorReduction = undefined;
  let compressionMethod = method;
  let lossyLevel = 80;
  let optimizationLevel = 2;
  let dithering = true;
  
  // Base settings by file size
  if (sizeMB > 10) {
    quality = 60;
    frameSkip = 1; // Skip every other frame
    colorReduction = 128;
    lossyLevel = 60;
    optimizationLevel = 3;
  } else if (sizeMB > 5) {
    quality = 70;
    frameSkip = 0;
    colorReduction = 192;
    lossyLevel = 70;
    optimizationLevel = 2;
  } else if (sizeMB > 2) {
    quality = 75;
    lossyLevel = 75;
  }
  
  // Method-specific adjustments
  switch (method) {
    case 'gifsicle':
      // Gifsicle is good for preserving quality while reducing size
      quality = Math.min(quality + 10, 90);
      dithering = sizeMB > 2; // Use dithering for larger files
      break;
    case 'lossy':
      // Lossy compression can be more aggressive
      quality = Math.max(quality - 10, 50);
      lossyLevel = Math.max(lossyLevel - 10, 40);
      dithering = false; // Disable dithering to reduce artifacts
      break;
  }
  
  return {
    quality,
    frameSkip,
    colorReduction,
    compressionMethod,
    lossyLevel,
    optimizationLevel,
    dithering,
    interlaced: false,
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