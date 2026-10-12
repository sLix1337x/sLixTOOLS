import GIFLib from 'gif.js';
import { bytesToMB } from './formatters';
import { config } from '../config';
import { terminateGifWorkers } from './gifConverter';

// GIF.js options interface
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
  addFrame(canvas: HTMLCanvasElement | CanvasRenderingContext2D | ImageData, options?: { delay?: number | undefined; copy?: boolean | undefined } | undefined): void;
  render(): void;
  abort(): void;
  freeWorkers: Worker[];
  activeWorkers: Worker[];
  on(event: 'finished', callback: (blob: Blob) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'progress', callback: (progress: number) => void): void;
  on(event: 'abort', callback: () => void): void;
  on(event: string, callback: (data: unknown) => void): void;
}

interface GifJsConstructor {
  new (options: GifJsOptions): GifJsInstance;
}

// gif.js is UMD: bundled via module.exports, it never sets window.GIF
const GIF = GIFLib as unknown as GifJsConstructor;

interface GifCompressionOptions {
  quality: number; // 0-100
  maxWidth?: number | undefined;
  maxHeight?: number | undefined;
  frameSkip?: number | undefined; // Skip every N frames
}

interface CompressionProgress {
  stage: 'loading' | 'extracting' | 'compressing' | 'rebuilding' | 'complete';
  progress: number;
  message: string;
  originalSize?: number | undefined;
  compressedSize?: number | undefined;
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



// WebCodecs ImageDecoder decodes every GIF frame; without it (older Firefox/Safari) only the first frame survives
export const supportsAnimatedGifDecode = (): boolean => typeof ImageDecoder !== 'undefined';

type ExtractedFrames = { frames: ImageData[]; delays: number[]; width: number; height: number };

// Decode all frames, keeping every (frameSkip + 1)th; skipped frames' delays fold into the kept frame
const decodeGifFrames = async (
  file: File,
  frameSkip: number,
  onProgress?: ProgressCallback
): Promise<ExtractedFrames> => {
  const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
  try {
    await decoder.tracks.ready;
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 1;
    const frames: ImageData[] = [];
    const delays: number[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new GifCompressionError('Failed to create canvas context', 'extracting');
    }

    for (let i = 0; i < frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      try {
        // VideoFrame.duration is in microseconds; GIF delay 0 plays as 100ms in browsers
        const delay = image.duration ? Math.round(image.duration / 1000) : 100;
        if (i % (frameSkip + 1) === 0) {
          canvas.width = image.displayWidth;
          canvas.height = image.displayHeight;
          ctx.drawImage(image, 0, 0);
          frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          delays.push(delay);
        } else {
          delays[delays.length - 1] += delay;
        }
      } finally {
        image.close();
      }
      onProgress?.({
        stage: 'extracting',
        progress: 20 + ((i + 1) / frameCount) * 20,
        message: `Extracting frame ${i + 1}/${frameCount}...`
      });
    }

    return { frames, delays, width: frames[0].width, height: frames[0].height };
  } finally {
    decoder.close();
  }
};

const extractGifFrames = async (
  file: File,
  frameSkip: number,
  onProgress?: ProgressCallback
): Promise<ExtractedFrames> => {
  if (supportsAnimatedGifDecode()) {
    return decodeGifFrames(file, frameSkip, onProgress);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new GifCompressionError('Failed to create canvas context', 'extracting'));
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(imageUrl);
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
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
      URL.revokeObjectURL(imageUrl);
      reject(new GifCompressionError('Failed to load image', 'loading'));
    };

    img.src = imageUrl;
  });
};

const compressFrame = (
  imageData: ImageData,
  quality: number
): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new GifCompressionError('Failed to create canvas context', 'compressing');
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  // Simple quality-based compression by reducing colors
  const compressedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = compressedImageData.data;
  
  // Reduce color depth based on quality
  const reduction = Math.floor((100 - quality) / 10) + 1;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] / reduction) * reduction;     // Red
    data[i + 1] = Math.floor(data[i + 1] / reduction) * reduction; // Green
    data[i + 2] = Math.floor(data[i + 2] / reduction) * reduction; // Blue
    // Alpha channel remains unchanged
  }

  return compressedImageData;
};


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
      frameSkip = 0
    } = options;

    onProgress?.({
      stage: 'loading',
      progress: 0,
      message: 'Loading GIF...',
      originalSize: file.size
    });

    onProgress?.({
      stage: 'extracting',
      progress: 20,
      message: 'Extracting frames...'
    });

    // Extract frames from the original GIF
    const { frames, delays, width, height } = await extractGifFrames(file, frameSkip, onProgress);

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

    onProgress?.({
      stage: 'rebuilding',
      progress: 60,
      message: 'Rebuilding GIF...'
    });

    // Create new GIF with compressed frames
    const gif = new GIF({
      workers: 2,
      quality: Math.max(1, Math.floor((100 - quality) / 10)),
      width: targetWidth,
      height: targetHeight,
      workerScript: config.gif.workerPath
    });

    // Frames are already thinned by frameSkip during extraction (delays stay aligned)
    const processedFrames = frames;

    processedFrames.forEach((frame, index) => {
      const compressedFrame = compressFrame(frame, quality);
      
      // Resize frame if needed
      if (targetWidth !== width || targetHeight !== height) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.putImageData(compressedFrame, 0, 0);
            
            ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
            
            gif.addFrame(canvas, { delay: delays[index] || 100 });
          }
        }
      } else {
        // Convert ImageData to canvas before adding to GIF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = compressedFrame.width;
          canvas.height = compressedFrame.height;
          ctx.putImageData(compressedFrame, 0, 0);
          
          gif.addFrame(canvas, { delay: delays[index] || 100 });
        }
      }
      
      onProgress?.({
        stage: 'rebuilding',
        progress: 60 + (index / processedFrames.length) * 30,
        message: `Processing frame ${index + 1}/${processedFrames.length}...`
      });
    });

    return new Promise((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        terminateGifWorkers(gif);
        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'Compression complete!',
          originalSize: file.size,
          compressedSize: blob.size
        });
        resolve(blob);
      });

      gif.on('error', (error: Error) => {
        terminateGifWorkers(gif);
        reject(new GifCompressionError('Failed to render GIF', 'rebuilding', error));
      });

      gif.render();
    });

  } catch (error) {
    if (error instanceof GifCompressionError) throw error;
    throw new GifCompressionError(
      'Compression failed',
      'unknown',
      error as Error
    );
  }
};

export const getOptimalCompressionSettings = (fileSize: number): GifCompressionOptions => {
  const sizeMB = bytesToMB(fileSize);
  
  let quality = 80;
  let frameSkip = 0;
  
  // Adjust settings based on file size
  if (sizeMB > 10) {
    quality = 60;
    frameSkip = 1; // Skip every other frame
  } else if (sizeMB > 5) {
    quality = 70;
  } else if (sizeMB > 2) {
    quality = 75;
  }
  
  return {
    quality,
    frameSkip,
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