import { getPerformanceMonitor } from './performanceMonitor.tsx';

// Enhanced error handling for image optimization
class ImageOptimizationError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'ImageOptimizationError';
  }
}

interface OptimizationOptions {
  quality: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
  preserveMetadata?: boolean;
}

interface OptimizationProgress {
  stage: 'loading' | 'processing' | 'compressing' | 'complete';
  progress: number;
  message: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

type ProgressCallback = (progress: OptimizationProgress) => void;

// Memory-aware canvas operations
class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maxDimension = 4096; // Prevent memory issues

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
      desynchronized: true // Better performance for animations
    });
    
    if (!ctx) {
      throw new ImageOptimizationError('Failed to create canvas context', 'initialization');
    }
    
    this.ctx = ctx;
  }

  resizeImage(
    img: HTMLImageElement, 
    maxWidth?: number, 
    maxHeight?: number
  ): { width: number; height: number } {
    let { width, height } = img;
    
    // Apply max dimension limits
    const actualMaxWidth = Math.min(maxWidth || width, this.maxDimension);
    const actualMaxHeight = Math.min(maxHeight || height, this.maxDimension);
    
    // Calculate new dimensions maintaining aspect ratio
    if (width > actualMaxWidth || height > actualMaxHeight) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = actualMaxWidth;
        height = Math.round(width / aspectRatio);
      } else {
        height = actualMaxHeight;
        width = Math.round(height * aspectRatio);
      }
    }
    
    // Ensure dimensions are positive integers
    width = Math.max(1, Math.floor(width));
    height = Math.max(1, Math.floor(height));
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Clear and draw
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(img, 0, 0, width, height);
    
    return { width, height };
  }

  toBlob(format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new ImageOptimizationError('Failed to create blob from canvas', 'compression'));
          }
        },
        format,
        quality / 100
      );
    });
  }

  cleanup() {
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.ctx.clearRect(0, 0, 1, 1);
  }
}

// Progressive JPEG optimization
const optimizeJPEG = async (
  imageFile: File,
  options: OptimizationOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const canvasManager = new CanvasManager();
  
  try {
    onProgress?.({ stage: 'loading', progress: 20, message: 'Loading image...' });
    
    // Load image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new ImageOptimizationError('Failed to load image', 'loading'));
      img.src = URL.createObjectURL(imageFile);
    });
    
    onProgress?.({ stage: 'processing', progress: 40, message: 'Resizing image...' });
    
    // Resize if needed
    const { width, height } = canvasManager.resizeImage(img, options.maxWidth, options.maxHeight);
    
    onProgress?.({ 
      stage: 'compressing', 
      progress: 60, 
      message: 'Compressing image...', 
      originalSize: imageFile.size 
    });
    
    // Convert to JPEG with quality setting
    const mimeType = options.progressive ? 'image/jpeg' : 'image/jpeg';
    const compressedBlob = await canvasManager.toBlob(mimeType, options.quality);
    
    // Cleanup
    URL.revokeObjectURL(img.src);
    canvasManager.cleanup();
    
    const compressionRatio = ((imageFile.size - compressedBlob.size) / imageFile.size) * 100;
    
    onProgress?.({ 
      stage: 'complete', 
      progress: 100, 
      message: 'Compression complete!',
      originalSize: imageFile.size,
      compressedSize: compressedBlob.size,
      compressionRatio
    });
    
    return compressedBlob;
    
  } catch (error) {
    canvasManager.cleanup();
    throw error;
  }
};

// WebP optimization with fallback
const optimizeWebP = async (
  imageFile: File,
  options: OptimizationOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  // Check WebP support
  const supportsWebP = await new Promise<boolean>((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => resolve(webP.height === 2);
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
  
  if (!supportsWebP) {
    console.warn('WebP not supported, falling back to JPEG');
    return optimizeJPEG(imageFile, { ...options, format: 'jpeg' }, onProgress);
  }
  
  const canvasManager = new CanvasManager();
  
  try {
    onProgress?.({ stage: 'loading', progress: 20, message: 'Loading image...' });
    
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new ImageOptimizationError('Failed to load image', 'loading'));
      img.src = URL.createObjectURL(imageFile);
    });
    
    onProgress?.({ stage: 'processing', progress: 40, message: 'Resizing image...' });
    
    canvasManager.resizeImage(img, options.maxWidth, options.maxHeight);
    
    onProgress?.({ 
      stage: 'compressing', 
      progress: 60, 
      message: 'Compressing to WebP...', 
      originalSize: imageFile.size 
    });
    
    const compressedBlob = await canvasManager.toBlob('image/webp', options.quality);
    
    URL.revokeObjectURL(img.src);
    canvasManager.cleanup();
    
    const compressionRatio = ((imageFile.size - compressedBlob.size) / imageFile.size) * 100;
    
    onProgress?.({ 
      stage: 'complete', 
      progress: 100, 
      message: 'WebP compression complete!',
      originalSize: imageFile.size,
      compressedSize: compressedBlob.size,
      compressionRatio
    });
    
    return compressedBlob;
    
  } catch (error) {
    canvasManager.cleanup();
    throw error;
  }
};

// Batch image optimization
export const optimizeImages = async (
  files: File[],
  options: OptimizationOptions,
  onProgress?: (fileIndex: number, fileProgress: OptimizationProgress, overallProgress: number) => void
): Promise<Blob[]> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('imageOptimizer');
  
  try {
    const results: Blob[] = [];
    const batchSize = Math.min(3, Math.max(1, Math.floor(navigator.hardwareConcurrency / 2))); // Limit concurrent processing
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        
        try {
          const fileProgress = (progress: OptimizationProgress) => {
            const overallProgress = ((fileIndex + progress.progress / 100) / files.length) * 100;
            onProgress?.(fileIndex, progress, overallProgress);
          };
          
          return await optimizeImage(file, options, fileProgress);
        } catch (error) {
          console.error(`Failed to optimize image ${fileIndex}:`, error);
          // Return original file as fallback
          return file;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Yield to main thread between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    monitor.trackMemoryUsage('imageOptimizer');
    return results;
    
  } finally {
    endRender();
  }
};

// Main optimization function
export const optimizeImage = async (
  imageFile: File,
  options: OptimizationOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('imageOptimizer');
  
  try {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Starting optimization...' });
    
    // Validate file
    if (!imageFile.type.startsWith('image/')) {
      throw new ImageOptimizationError('Invalid file type', 'validation');
    }
    
    // Check file size (limit to 50MB)
    const maxFileSize = 50 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      throw new ImageOptimizationError('File too large', 'validation');
    }
    
    // Determine optimization strategy
    const format = options.format || 'jpeg';
    
    let result: Blob;
    
    switch (format) {
      case 'webp':
        result = await optimizeWebP(imageFile, options, onProgress);
        break;
      case 'png':
        // For PNG, we'll use canvas compression
        result = await optimizeJPEG(imageFile, { ...options, format: 'png' }, onProgress);
        break;
      case 'jpeg':
      default:
        result = await optimizeJPEG(imageFile, options, onProgress);
        break;
    }
    
    monitor.trackMemoryUsage('imageOptimizer');
    return result;
    
  } catch (error) {
    console.error('Image optimization failed:', error);
    
    if (error instanceof ImageOptimizationError) {
      throw error;
    }
    
    throw new ImageOptimizationError(
      `Unexpected error during optimization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  } finally {
    endRender();
  }
};

// Utility function to get optimal compression settings
export const getOptimalSettings = (fileSize: number, fileType: string): OptimizationOptions => {
  const sizeMB = fileSize / (1024 * 1024);
  
  // Adjust quality based on file size
  let quality = 85;
  if (sizeMB > 10) quality = 70;
  else if (sizeMB > 5) quality = 75;
  else if (sizeMB > 2) quality = 80;
  
  // Adjust max dimensions based on file size
  let maxWidth = 1920;
  let maxHeight = 1080;
  
  if (sizeMB > 20) {
    maxWidth = 1280;
    maxHeight = 720;
  } else if (sizeMB > 10) {
    maxWidth = 1600;
    maxHeight = 900;
  }
  
  // Determine optimal format
  let format: 'jpeg' | 'png' | 'webp' = 'jpeg';
  if (fileType.includes('png') && sizeMB < 2) {
    format = 'png'; // Keep PNG for small files or transparency
  } else if (sizeMB > 1) {
    format = 'webp'; // Use WebP for larger files if supported
  }
  
  return {
    quality,
    maxWidth,
    maxHeight,
    format,
    progressive: sizeMB > 1,
    preserveMetadata: false
  };
};

// Export types and error class
export { 
  ImageOptimizationError, 
  type OptimizationOptions, 
  type OptimizationProgress, 
  type ProgressCallback 
};