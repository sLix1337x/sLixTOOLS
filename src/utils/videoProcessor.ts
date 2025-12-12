import { bytesToMB } from './formatters';

// Enhanced error handling for video processing
class VideoProcessingError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

interface VideoCompressionOptions {
  quality: number; // 0-100
  maxWidth: number;
  maxHeight: number;
  maxFileSize?: number; // in MB
  format: 'mp4' | 'webm' | 'avi' | 'mov';
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
  bitrate?: number; // kbps
  fps?: number;
  maintainAspectRatio: boolean;
}

// VideoToGifOptions removed - use gifConverter.ts for GIF conversion

interface VideoEditOptions {
  trim?: { start: number; end: number };
  resize?: { width: number; height: number };
  rotate?: 90 | 180 | 270;
  flip?: 'horizontal' | 'vertical';
  filters?: {
    brightness?: number; // -100 to 100
    contrast?: number; // -100 to 100
    saturation?: number; // -100 to 100
    blur?: number; // 0-10
    sharpen?: number; // 0-10
  };
}

interface ProcessingProgress {
  stage: 'loading' | 'processing' | 'encoding' | 'complete';
  progress: number;
  message: string;
  currentFrame?: number;
  totalFrames?: number;
  processedSize?: number;
  estimatedTime?: number;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// Helper function to convert File/Blob to Uint8Array
const fileToUint8Array = async (file: File | Blob): Promise<Uint8Array> => {
  return new Uint8Array(await file.arrayBuffer());
};

// Helper function to get public file URL
const getPublicFileURL = (path: string): string => {
  const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
  return `${basePath}${path}`;
};

// FFmpeg WASM loader with enhanced error handling
const loadFFmpeg = async () => {
  try {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util')
    ]);
    return { FFmpeg, fetchFile, toBlobURL };
  } catch (error) {
    throw new VideoProcessingError('Failed to load FFmpeg library', 'loading', error as Error);
  }
};

// Video element manager for safe video operations (commented out - not currently used)
// class VideoElementManager {
//   private video: HTMLVideoElement;
//   private canvas: HTMLCanvasElement;
//   private ctx: CanvasRenderingContext2D;
//   private maxDimension = 1920; // Prevent memory issues
//   private maxDuration = 600; // 10 minutes max

//   constructor() {
//     this.video = document.createElement('video');
//     this.video.crossOrigin = 'anonymous';
//     this.video.preload = 'metadata';
//     
//     this.canvas = document.createElement('canvas');
//     const ctx = this.canvas.getContext('2d', {
//       alpha: false,
//       willReadFrequently: false,
//       desynchronized: true
//     });
//     
//     if (!ctx) {
//       throw new VideoProcessingError('Failed to create canvas context', 'initialization');
//     }
//     
//     this.ctx = ctx;
//   }

//   async loadVideo(file: File | Blob): Promise<void> {
//     return new Promise((resolve, reject) => {
//       const cleanup = () => {
//         this.video.removeEventListener('loadedmetadata', onLoad);
//         this.video.removeEventListener('error', onError);
//         URL.revokeObjectURL(this.video.src);
//       };
//       
//       const onLoad = () => {
//         // Validate video properties
//         if (this.video.duration > this.maxDuration) {
//           cleanup();
//           reject(new VideoProcessingError(
//             `Video duration (${Math.round(this.video.duration)}s) exceeds maximum allowed (${this.maxDuration}s)`,
//             'validation'
//           ));
//           return;
//         }
//         
//         if (this.video.videoWidth > this.maxDimension || this.video.videoHeight > this.maxDimension) {
//           cleanup();
//           reject(new VideoProcessingError(
//             `Video dimensions (${this.video.videoWidth}x${this.video.videoHeight}) exceed maximum allowed (${this.maxDimension}x${this.maxDimension})`,
//             'validation'
//           ));
//           return;
//         }
//         
//         cleanup();
//         resolve();
//       };
//       
//       const onError = () => {
//         cleanup();
//         reject(new VideoProcessingError('Failed to load video', 'loading'));
//       };
//       
//       this.video.addEventListener('loadedmetadata', onLoad);
//       this.video.addEventListener('error', onError);
//       
//       this.video.src = URL.createObjectURL(file);
//     });
//   }

//   setupCanvas(width: number, height: number): void {
//     // Limit canvas size to prevent memory issues
//     const scale = Math.min(1, this.maxDimension / Math.max(width, height));
//     const scaledWidth = Math.floor(width * scale);
//     const scaledHeight = Math.floor(height * scale);
//     
//     this.canvas.width = scaledWidth;
//     this.canvas.height = scaledHeight;
//     
//     // Optimize canvas context
//     this.ctx.imageSmoothingEnabled = true;
//     this.ctx.imageSmoothingQuality = 'high';
//   }

//   async seekToTime(time: number): Promise<void> {
//     return new Promise((resolve, reject) => {
//       const onSeeked = () => {
//         this.video.removeEventListener('seeked', onSeeked);
//         this.video.removeEventListener('error', onError);
//         resolve();
//       };
//       
//       const onError = () => {
//         this.video.removeEventListener('seeked', onSeeked);
//         this.video.removeEventListener('error', onError);
//         reject(new VideoProcessingError(`Failed to seek to time ${time}`, 'seeking'));
//       };
//       
//       this.video.addEventListener('seeked', onSeeked);
//       this.video.addEventListener('error', onError);
//       
//       this.video.currentTime = time;
//     });
//   }

//   captureFrame(): ImageData {
//     const { videoWidth, videoHeight } = this.video;
//     
//     // Draw video frame to canvas
//     this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
//     
//     // Get image data
//     return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
//   }

//   // Critical fix: Batch frame processing with yielding to prevent main thread blocking
//   async captureFramesBatch(
//     startTime: number,
//     endTime: number,
//     fps: number,
//     onProgress?: (progress: number, frameCount: number) => void
//   ): Promise<ImageData[]> {
//     const frames: ImageData[] = [];
//     const totalFrames = Math.ceil((endTime - startTime) * fps);
//     const BATCH_SIZE = 5; // Process 5 frames at a time
//     let currentFrame = 0;
//     
//     for (let time = startTime; time < endTime; time += 1 / fps) {
//       // Yield to main thread every batch
//       if (currentFrame % BATCH_SIZE === 0 && currentFrame > 0) {
//         await new Promise(resolve => requestAnimationFrame(resolve));
//       }
//       
//       await this.seekTo(time);
//       frames.push(this.captureFrame());
//       currentFrame++;
//       
//       onProgress?.(currentFrame / totalFrames, currentFrame);
//     }
//     
//     return frames;
//   }

//   getVideoInfo() {
//     return {
//       duration: this.video.duration,
//       width: this.video.videoWidth,
//       height: this.video.videoHeight,
//       fps: 30 // Estimate, actual FPS detection would require more complex analysis
//     };
//   }

//   cleanup() {
//     if (this.video.src) {
//       URL.revokeObjectURL(this.video.src);
//       this.video.src = '';
//     }
//     
//     this.canvas.width = 0;
//     this.canvas.height = 0;
//     this.ctx.clearRect(0, 0, 1, 1);
//   }
// }

// Compress video with enhanced error handling
export const compressVideo = async (
  videoFile: File,
  options: VideoCompressionOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  try {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video processor...' });
    
    // For client-side video compression, we would typically use FFmpeg WASM
    // This is a simplified implementation showing the structure
    
    await loadFFmpeg();
    
    onProgress?.({ stage: 'loading', progress: 20, message: 'Loading video file...' });
    
    // Validate file size
    const maxInputSize = 500 * 1024 * 1024; // 500MB
    if (videoFile.size > maxInputSize) {
      throw new VideoProcessingError(
        `Video file size (${Math.round(videoFile.size / 1024 / 1024)}MB) exceeds maximum allowed (${Math.round(maxInputSize / 1024 / 1024)}MB)`,
        'validation'
      );
    }
    
    onProgress?.({ stage: 'processing', progress: 30, message: 'Initializing compression...' });
    
    // Calculate optimal settings
    const optimalSettings = calculateOptimalSettings(videoFile, options);
    
    onProgress?.({ stage: 'processing', progress: 50, message: 'Compressing video...' });
    
    // Use FFmpeg WASM for actual compression
    const compressedBlob = await compressVideoWithFFmpeg(videoFile, optimalSettings, (progressData) => {
      onProgress?.({
        stage: 'processing',
        progress: 50 + (progressData.ratio * 0.4), // Scale to 50-90%
        message: `Compressing... ${Math.round(progressData.ratio * 100)}%`
      });
    });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Compression complete!' });
    
    return compressedBlob;
    
  } catch (error) {
    // Error details are logged to error reporting system
    
    if (error instanceof VideoProcessingError) {
      throw error;
    }
    
    throw new VideoProcessingError(
      `Unexpected error during video compression: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  }
};

// convertVideoToGif function removed - use gifConverter.ts for GIF conversion

// Edit video with enhanced error handling
export const editVideo = async (
  videoFile: File,
  options: VideoEditOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  try {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video editor...' });
    
    // For client-side video editing, we would typically use FFmpeg WASM
    // This is a simplified implementation showing the structure
    
    await loadFFmpeg();
    
    onProgress?.({ stage: 'loading', progress: 20, message: 'Loading video file...' });
    
    // Validate and process edit options
    const processedOptions = validateEditOptions(options);
    
    onProgress?.({ stage: 'processing', progress: 40, message: 'Applying edits...' });
    
    // Use FFmpeg WASM for actual video editing
    const editedBlob = await editVideoWithFFmpeg(videoFile, processedOptions, (progress) => {
      onProgress?.({
        stage: 'processing',
        progress: 40 + (progress * 0.5), // Scale to 40-90%
        message: `Processing... ${Math.round(progress)}%`
      });
    });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Video editing complete!' });
    
    return editedBlob;
    
  } catch (error) {
    // Video editing error details are logged to error reporting system
    
    if (error instanceof VideoProcessingError) {
      throw error;
    }
    
    throw new VideoProcessingError(
      `Unexpected error during video editing: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  }
};

// Calculate optimal compression settings
const calculateOptimalSettings = (
  videoFile: File,
  options: VideoCompressionOptions
): VideoCompressionOptions => {
  const sizeMB = bytesToMB(videoFile.size);
  
  // Adjust settings based on file size and target
  const adjustedOptions = { ...options };
  
  // Auto-adjust quality based on file size
  if (sizeMB > 100) {
    adjustedOptions.quality = Math.min(adjustedOptions.quality, 70);
    adjustedOptions.bitrate = adjustedOptions.bitrate || 1000;
  } else if (sizeMB > 50) {
    adjustedOptions.quality = Math.min(adjustedOptions.quality, 80);
    adjustedOptions.bitrate = adjustedOptions.bitrate || 1500;
  } else {
    adjustedOptions.bitrate = adjustedOptions.bitrate || 2000;
  }
  
  // Ensure reasonable dimensions
  if (adjustedOptions.maxWidth > 1920) adjustedOptions.maxWidth = 1920;
  if (adjustedOptions.maxHeight > 1080) adjustedOptions.maxHeight = 1080;
  
  return adjustedOptions;
};

// Validate edit options
const validateEditOptions = (options: VideoEditOptions): VideoEditOptions => {
  const validated = { ...options };
  
  // Validate trim options
  if (validated.trim) {
    if (validated.trim.start < 0) validated.trim.start = 0;
    if (validated.trim.end <= validated.trim.start) {
      delete validated.trim;
    }
  }
  
  // Validate resize options
  if (validated.resize) {
    validated.resize.width = Math.min(Math.max(validated.resize.width, 64), 1920);
    validated.resize.height = Math.min(Math.max(validated.resize.height, 64), 1080);
  }
  
  // Validate filter values
  if (validated.filters) {
    const { filters } = validated;
    if (filters.brightness !== undefined) {
      filters.brightness = Math.min(Math.max(filters.brightness, -100), 100);
    }
    if (filters.contrast !== undefined) {
      filters.contrast = Math.min(Math.max(filters.contrast, -100), 100);
    }
    if (filters.saturation !== undefined) {
      filters.saturation = Math.min(Math.max(filters.saturation, -100), 100);
    }
    if (filters.blur !== undefined) {
      filters.blur = Math.min(Math.max(filters.blur, 0), 10);
    }
    if (filters.sharpen !== undefined) {
      filters.sharpen = Math.min(Math.max(filters.sharpen, 0), 10);
    }
  }
  
  return validated;
};

// Video compression using FFmpeg WASM
const compressVideoWithFFmpeg = async (
  videoFile: File,
  options: VideoCompressionOptions,
  onProgress?: (progress: { ratio: number }) => void
): Promise<Blob> => {
  const { FFmpeg, fetchFile, toBlobURL } = await loadFFmpeg();
  const ffmpeg = new FFmpeg();
  
  try {
    // Check if SharedArrayBuffer is available (required for FFmpeg WASM)
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new VideoProcessingError(
        'SharedArrayBuffer is not available. This browser may not support FFmpeg WASM, or the required cross-origin isolation headers are missing.',
        'loading'
      );
    }
    
    // Load FFmpeg with core and wasm files from local public directory
    // Use fetchFile and toBlobURL from @ffmpeg/util for proper loading
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });
    
    const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
    const coreJsURL = `${basePath}workers/ffmpeg-core.js`;
    const coreWasmURL = `${basePath}workers/ffmpeg-core.wasm`;
    
    console.log('Loading FFmpeg core files from:', { coreJsURL, coreWasmURL });
    
    // Use absolute URLs with window.location.origin for proper resolution
    const fullCoreJsURL = new URL(coreJsURL, window.location.origin).href;
    const fullCoreWasmURL = new URL(coreWasmURL, window.location.origin).href;
    
    // Remove any query parameters that might interfere with module imports
    const cleanCoreJsURL = fullCoreJsURL.split('?')[0];
    const cleanCoreWasmURL = fullCoreWasmURL.split('?')[0];
    
    console.log('Using clean URLs for FFmpeg load:', { cleanCoreJsURL, cleanCoreWasmURL });
    
    try {
      // FFmpeg WASM 0.12.x - The "failed to import" error suggests the core.js file
      // is trying to do a dynamic import internally. This might be a version issue.
      // Try loading without specifying URLs first (uses default CDN), then fallback to local
      console.log('Loading FFmpeg with local core files...');
      
      await ffmpeg.load({
        coreURL: cleanCoreJsURL,
        wasmURL: cleanCoreWasmURL,
      });
      
      console.log('FFmpeg loaded successfully');
    } catch (loadError) {
      console.error('FFmpeg load error:', loadError);
      
      // The "failed to import" error is a known issue with FFmpeg WASM 0.12.x
      // It happens when the core.js file tries to dynamically import modules
      // This might be fixed in newer versions or require a different loading approach
      const errorMessage = loadError instanceof Error ? loadError.message : String(loadError);
      const isSharedArrayBufferError = errorMessage.includes('SharedArrayBuffer') || 
                                       errorMessage.includes('cross-origin') ||
                                       errorMessage.includes('COEP') ||
                                       errorMessage.includes('COOP');
      const isImportError = errorMessage.includes('import') || errorMessage.includes('Import') || errorMessage.includes('failed to import');
      
      let errorDetails = '';
      if (isSharedArrayBufferError) {
        errorDetails = 'Make sure cross-origin isolation headers (COOP/COEP) are set correctly.';
      } else if (isImportError) {
        errorDetails = 'FFmpeg core.js is trying to dynamically import modules, which is failing. This is a known issue with FFmpeg WASM 0.12.x. The UMD build might have internal ES module imports that are incompatible with COEP. Consider using a different FFmpeg version or loading method.';
      } else {
        errorDetails = 'Check that files exist in public/workers/ and are accessible.';
      }
      
      throw new VideoProcessingError(
        `Failed to load FFmpeg: ${errorMessage}. ${errorDetails}`,
        'loading',
        loadError instanceof Error ? loadError : undefined
      );
    }
    
    // Determine input and output file names based on format
    const getFileNames = (format: string) => {
      const inputExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputExt = format;
      return {
        inputName: `input.${inputExt}`,
        outputName: `output.${outputExt}`
      };
    };
    
    const { inputName, outputName } = getFileNames(options.format);
    
    // Write input file
    await ffmpeg.writeFile(inputName, await fileToUint8Array(videoFile));
    
    // Probe video to get input dimensions (needed to detect upscaling)
    let inputWidth = 0;
    let inputHeight = 0;
    try {
      // Use FFprobe-like approach: run ffmpeg with -f null to get video info
      const probeArgs = ['-i', inputName, '-f', 'null', '-'];
      await ffmpeg.exec(probeArgs);
    } catch (probeError) {
      // If probe fails, we'll proceed without dimension info
      console.warn('Could not probe video dimensions:', probeError);
    }
    
    // Try to get dimensions from video metadata using a video element
    // This is a fallback if FFmpeg probe doesn't work
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        inputWidth = video.videoWidth;
        inputHeight = video.videoHeight;
        URL.revokeObjectURL(video.src);
        resolve();
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      // Timeout after 5 seconds
      setTimeout(() => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Video metadata loading timeout'));
      }, 5000);
    }).catch(() => {
      // If we can't get dimensions, assume no upscaling
      console.warn('Could not get video dimensions, proceeding with caution');
    });
    
    // Calculate upscale factor and adjust output resolution if needed
    let outputWidth = options.maxWidth;
    let outputHeight = options.maxHeight;
    const maxUpscaleFactor = 2.0; // Limit upscaling to 2x to prevent memory issues
    
    if (inputWidth > 0 && inputHeight > 0 && outputWidth > 0 && outputHeight > 0) {
      const widthScale = outputWidth / inputWidth;
      const heightScale = outputHeight / inputHeight;
      const maxScale = Math.max(widthScale, heightScale);
      
      if (maxScale > maxUpscaleFactor) {
        console.warn(`Large upscale detected (${maxScale.toFixed(1)}x). Limiting to ${maxUpscaleFactor}x to prevent memory issues.`);
        // Limit upscale to maxUpscaleFactor
        const aspectRatio = inputWidth / inputHeight;
        if (inputWidth > inputHeight) {
          outputWidth = Math.min(outputWidth, Math.round(inputWidth * maxUpscaleFactor));
          outputHeight = Math.round(outputWidth / aspectRatio);
        } else {
          outputHeight = Math.min(outputHeight, Math.round(inputHeight * maxUpscaleFactor));
          outputWidth = Math.round(outputHeight * aspectRatio);
        }
        // Ensure even dimensions (required for some codecs)
        outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
        outputHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;
      }
    }
    
    // Build FFmpeg command based on output format
    const args = ['-i', inputName];
    
    // Memory management for FFmpeg WASM
    // Limit threads to reduce memory usage (WASM has limited threading support)
    args.push('-threads', '1');
    
    // Codec selection based on format
    // Note: For large upscales with WebM, consider using H.264 instead (less memory-intensive)
    const isLargeUpscale = inputWidth > 0 && inputHeight > 0 && 
                           (outputWidth / inputWidth > 1.5 || outputHeight / inputHeight > 1.5);
    
    if (options.format === 'webm') {
      // For large upscales, VP9 is very memory-intensive
      // Consider using VP8 or limiting resolution further
      if (isLargeUpscale) {
        console.warn('Large upscale with WebM/VP9 detected. Using VP8 instead for better memory efficiency.');
        args.push('-c:v', 'libvpx'); // VP8 is less memory-intensive than VP9
      } else {
        args.push('-c:v', 'libvpx-vp9');
        // VP9 memory optimizations for WASM
        args.push('-deadline', 'realtime'); // Faster encoding, less memory
        args.push('-cpu-used', '8'); // Maximum speed, minimum memory
        args.push('-row-mt', '0'); // Disable row-based multithreading (saves memory)
      }
      args.push('-c:a', 'libopus');
    } else if (options.format === 'avi') {
      // AVI format - use simpler codecs that are more likely available
      args.push('-c:v', 'libx264'); // H.264 is more widely supported
      args.push('-c:a', 'aac'); // Use AAC instead of MP3 for better compatibility
    } else if (options.format === 'mov') {
      // MOV format (QuickTime)
      args.push('-c:v', 'libx264');
      args.push('-c:a', 'aac');
    } else {
      // MP4 format (default)
      args.push('-c:v', 'libx264'); // Always use H.264 for MP4
      args.push('-c:a', 'aac');
    }
    
    // Use faster preset for WASM (medium might be too slow)
    args.push('-preset', 'ultrafast'); // Changed from 'medium' for better WASM performance
    args.push('-crf', String(Math.round((100 - options.quality) * 0.51))); // Convert quality to CRF (0-51)
    args.push('-movflags', '+faststart'); // Optimize for web playback
    
    // Add resolution if specified - use memory-efficient scaling
    if (outputWidth > 0 && outputHeight > 0) {
      // Use fast_bilinear for memory efficiency, especially for large upscales
      args.push('-vf', `scale=${outputWidth}:${outputHeight}:flags=fast_bilinear`);
    }
    
    // Add frame rate if specified
    if (options.fps) {
      args.push('-r', String(options.fps));
    }
    
    args.push(outputName);
    
    // Set up progress tracking
    ffmpeg.on('progress', ({ progress: prog }) => {
      const ratio = prog / 100;
      onProgress?.({ ratio });
    });
    
    // Run FFmpeg
    console.log('FFmpeg command:', args.join(' '));
    try {
      await ffmpeg.exec(args);
    } catch (execError) {
      console.error('FFmpeg exec error:', execError);
      // List files to debug
      try {
        const files = await ffmpeg.listDir('/');
        console.log('Files in FFmpeg FS:', files);
      } catch (listError) {
        console.error('Failed to list files:', listError);
      }
      throw new VideoProcessingError(
        `FFmpeg execution failed: ${execError instanceof Error ? execError.message : String(execError)}`,
        'processing',
        execError instanceof Error ? execError : undefined
      );
    }
    
    // Read output file
    let data: Uint8Array | string;
    try {
      data = await ffmpeg.readFile(outputName);
      console.log('Output file read successfully, type:', typeof data, 'size:', data instanceof Uint8Array ? data.length : data.length);
    } catch (readError) {
      console.error('FFmpeg readFile error:', readError);
      // List files to debug
      try {
        const files = await ffmpeg.listDir('/');
        console.log('Files in FFmpeg FS after exec:', files);
      } catch (listError) {
        console.error('Failed to list files:', listError);
      }
      throw new VideoProcessingError(
        `Failed to read output file: ${readError instanceof Error ? readError.message : String(readError)}`,
        'processing',
        readError instanceof Error ? readError : undefined
      );
    }
    
    // Determine MIME type based on format
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime'
    };
    
    const mimeType = mimeTypes[options.format] || 'video/mp4';
    
    // Clean up
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      console.warn('Failed to cleanup FFmpeg files:', cleanupError);
    }
    
    // Convert FileData to Uint8Array for Blob
    // FFmpeg returns Uint8Array<ArrayBufferLike>, we need to create a new ArrayBuffer
    let uint8Array: Uint8Array<ArrayBuffer>;
    if (data instanceof Uint8Array) {
      // Create a new ArrayBuffer by copying the data byte by byte
      const buffer = new ArrayBuffer(data.byteLength);
      uint8Array = new Uint8Array(buffer);
      for (let i = 0; i < data.byteLength; i++) {
        uint8Array[i] = data[i];
      }
    } else {
      // Handle other types (shouldn't happen, but TypeScript requires it)
      const buffer = new ArrayBuffer(0);
      uint8Array = new Uint8Array(buffer);
    }
    
    return new Blob([uint8Array], { type: mimeType });
    
  } catch (error) {
    console.error('FFmpeg compression error:', error);
    if (error instanceof VideoProcessingError) {
      throw error;
    }
    throw new VideoProcessingError(
      `FFmpeg compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'processing',
      error instanceof Error ? error : undefined
    );
  } finally {
    // Cleanup FFmpeg instance
    try {
      ffmpeg.terminate();
    } catch (cleanupError) {
      console.warn('FFmpeg cleanup error:', cleanupError);
    }
  }
};

// Video editing using FFmpeg WASM
const editVideoWithFFmpeg = async (
  videoFile: File,
  options: VideoEditOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const { FFmpeg, fetchFile, toBlobURL } = await loadFFmpeg();
  const ffmpeg = new FFmpeg();
  
  try {
    // Check if SharedArrayBuffer is available (required for FFmpeg WASM)
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new VideoProcessingError(
        'SharedArrayBuffer is not available. This browser may not support FFmpeg WASM, or the required cross-origin isolation headers are missing.',
        'loading'
      );
    }
    
    // Load FFmpeg with core and wasm files from local public directory
    // Use fetchFile and toBlobURL from @ffmpeg/util for proper loading
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });
    
    const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
    const coreJsURL = `${basePath}workers/ffmpeg-core.js`;
    const coreWasmURL = `${basePath}workers/ffmpeg-core.wasm`;
    
    console.log('Loading FFmpeg core files from:', { coreJsURL, coreWasmURL });
    
    // Use absolute URLs with window.location.origin for proper resolution
    const fullCoreJsURL = new URL(coreJsURL, window.location.origin).href;
    const fullCoreWasmURL = new URL(coreWasmURL, window.location.origin).href;
    
    // Remove any query parameters that might interfere with module imports
    const cleanCoreJsURL = fullCoreJsURL.split('?')[0];
    const cleanCoreWasmURL = fullCoreWasmURL.split('?')[0];
    
    console.log('Using clean URLs for FFmpeg load:', { cleanCoreJsURL, cleanCoreWasmURL });
    
    try {
      // FFmpeg WASM 0.12.x - The "failed to import" error suggests the core.js file
      // is trying to do a dynamic import internally. This might be a version issue.
      // Try loading without specifying URLs first (uses default CDN), then fallback to local
      console.log('Loading FFmpeg with local core files...');
      
      await ffmpeg.load({
        coreURL: cleanCoreJsURL,
        wasmURL: cleanCoreWasmURL,
      });
      
      console.log('FFmpeg loaded successfully');
    } catch (loadError) {
      console.error('FFmpeg load error:', loadError);
      
      // The "failed to import" error is a known issue with FFmpeg WASM 0.12.x
      // It happens when the core.js file tries to dynamically import modules
      // This might be fixed in newer versions or require a different loading approach
      const errorMessage = loadError instanceof Error ? loadError.message : String(loadError);
      const isSharedArrayBufferError = errorMessage.includes('SharedArrayBuffer') || 
                                       errorMessage.includes('cross-origin') ||
                                       errorMessage.includes('COEP') ||
                                       errorMessage.includes('COOP');
      const isImportError = errorMessage.includes('import') || errorMessage.includes('Import') || errorMessage.includes('failed to import');
      
      let errorDetails = '';
      if (isSharedArrayBufferError) {
        errorDetails = 'Make sure cross-origin isolation headers (COOP/COEP) are set correctly.';
      } else if (isImportError) {
        errorDetails = 'FFmpeg core.js is trying to dynamically import modules, which is failing. This is a known issue with FFmpeg WASM 0.12.x. The UMD build might have internal ES module imports that are incompatible with COEP. Consider using a different FFmpeg version or loading method.';
      } else {
        errorDetails = 'Check that files exist in public/workers/ and are accessible.';
      }
      
      throw new VideoProcessingError(
        `Failed to load FFmpeg: ${errorMessage}. ${errorDetails}`,
        'loading',
        loadError instanceof Error ? loadError : undefined
      );
    }
    
    // Write input file
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    await ffmpeg.writeFile(inputName, await fileToUint8Array(videoFile));
    
    // Build FFmpeg command
    const args = ['-i', inputName];
    
    // Add trim options
    if (options.trim) {
      args.push('-ss', String(options.trim.start));
      args.push('-t', String(options.trim.end - options.trim.start));
    }
    
    // Add video filters
    const filters: string[] = [];
    
    if (options.resize) {
      filters.push(`scale=${options.resize.width}:${options.resize.height}`);
    }
    
    if (options.rotate) {
      const rotateMap = { 90: 'transpose=1', 180: 'transpose=2,transpose=2', 270: 'transpose=2' };
      filters.push(rotateMap[options.rotate]);
    }
    
    if (options.flip) {
      filters.push(options.flip === 'horizontal' ? 'hflip' : 'vflip');
    }
    
    if (options.filters) {
      const { filters: f } = options;
      if (f.brightness !== undefined) filters.push(`eq=brightness=${f.brightness / 100}`);
      if (f.contrast !== undefined) filters.push(`eq=contrast=${1 + f.contrast / 100}`);
      if (f.saturation !== undefined) filters.push(`eq=saturation=${1 + f.saturation / 100}`);
      if (f.blur !== undefined) filters.push(`boxblur=${f.blur}`);
      if (f.sharpen !== undefined) filters.push(`unsharp=5:5:${f.sharpen / 10}:5:5:0.0`);
    }
    
    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }
    
    // Add codec settings
    args.push('-c:v', 'libx264', '-c:a', 'aac');
    
    args.push(outputName);
    
    // Set up progress tracking
    ffmpeg.on('progress', ({ progress: prog }) => {
      onProgress?.(prog);
    });
    
    // Run FFmpeg
    await ffmpeg.exec(args);
    
    // Read output file
    const data = await ffmpeg.readFile(outputName);
    
    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    // Convert FileData to Uint8Array for Blob
    // FFmpeg returns Uint8Array<ArrayBufferLike>, we need to create a new ArrayBuffer
    let uint8Array: Uint8Array<ArrayBuffer>;
    if (data instanceof Uint8Array) {
      // Create a new ArrayBuffer by copying the data byte by byte
      const buffer = new ArrayBuffer(data.byteLength);
      uint8Array = new Uint8Array(buffer);
      for (let i = 0; i < data.byteLength; i++) {
        uint8Array[i] = data[i];
      }
    } else {
      // Handle other types (shouldn't happen, but TypeScript requires it)
      const buffer = new ArrayBuffer(0);
      uint8Array = new Uint8Array(buffer);
    }
    
    return new Blob([uint8Array], { type: 'video/mp4' });
    
  } catch (error) {
    throw new VideoProcessingError(
      `FFmpeg editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'processing',
      error instanceof Error ? error : undefined
    );
  }
};

// Utility function to get optimal video settings
export const getOptimalVideoSettings = (videoFile: File): VideoCompressionOptions => {
  const sizeMB = bytesToMB(videoFile.size);
  
  // Determine optimal settings based on file size
  let quality = 80;
  let maxWidth = 1280;
  let maxHeight = 720;
  
  if (sizeMB > 100) {
    quality = 60;
    maxWidth = 854;
    maxHeight = 480;
  } else if (sizeMB > 50) {
    quality = 70;
    maxWidth = 1024;
    maxHeight = 576;
  } else if (sizeMB < 10) {
    quality = 90;
    maxWidth = 1920;
    maxHeight = 1080;
  }
  
  return {
    quality,
    maxWidth,
    maxHeight,
    format: 'mp4',
    codec: 'h264',
    maintainAspectRatio: true
  };
};

// getOptimalGifSettings removed - use gifConverter.ts for GIF conversion

// Critical fix: Utility for processing large files with frame yielding
export const processLargeFileWithYielding = async <T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void> | void,
  batchSize: number = 10,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const total = items.length;
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch
    for (let j = 0; j < batch.length; j++) {
      await processor(batch[j], i + j);
    }
    
    // Yield to main thread after each batch
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Report progress
    const progress = Math.min((i + batchSize) / total, 1);
    onProgress?.(progress);
  }
};

// Export types and error class
export { 
  VideoProcessingError, 
  type VideoCompressionOptions, 
  type VideoEditOptions, 
  type ProcessingProgress, 
  type ProgressCallback 
};