// Enhanced error handling for video processing
class VideoProcessingError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

interface VideoCompressionOptions {
  quality: number; // CRF passed straight to the encoder (lower = better, UI 18-35)
  maxWidth: number;
  maxHeight: number;
  maxFileSize?: number; // in MB
  format: 'mp4' | 'webm' | 'avi' | 'mov';
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
  bitrate?: number; // kbps
  fps?: number;
  maintainAspectRatio: boolean;
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
    
    onProgress?.({ stage: 'processing', progress: 50, message: 'Compressing video...' });

    // Use FFmpeg WASM for actual compression
    const compressedBlob = await compressVideoWithFFmpeg(videoFile, options, (progressData) => {
      onProgress?.({
        stage: 'processing',
        progress: 50 + (progressData.ratio * 40), // Scale to 50-90%
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

// Video compression using FFmpeg WASM
const compressVideoWithFFmpeg = async (
  videoFile: File,
  options: VideoCompressionOptions,
  onProgress?: (progress: { ratio: number }) => void
): Promise<Blob> => {
  const { FFmpeg } = await loadFFmpeg();
  const ffmpeg = new FFmpeg();
  
  // Single-thread core (public/workers): no SharedArrayBuffer / cross-origin isolation needed
  const logTail: string[] = [];
  try {
    // Load FFmpeg with core and wasm files from local public directory
    ffmpeg.on('log', ({ message }) => {
      if (import.meta.env.DEV) console.log('FFmpeg log:', message);
      logTail.push(message);
      if (logTail.length > 5) logTail.shift();
    });
    
    const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
    const coreJsURL = `${basePath}workers/ffmpeg-core.js`;
    const coreWasmURL = `${basePath}workers/ffmpeg-core.wasm`;
    
    if (import.meta.env.DEV) console.log('Loading FFmpeg core files from:', { coreJsURL, coreWasmURL });
    
    // Use absolute URLs with window.location.origin for proper resolution
    const fullCoreJsURL = new URL(coreJsURL, window.location.origin).href;
    const fullCoreWasmURL = new URL(coreWasmURL, window.location.origin).href;
    
    // Remove any query parameters that might interfere with module imports
    const cleanCoreJsURL = fullCoreJsURL.split('?')[0];
    const cleanCoreWasmURL = fullCoreWasmURL.split('?')[0];
    
    if (import.meta.env.DEV) console.log('Using clean URLs for FFmpeg load:', { cleanCoreJsURL, cleanCoreWasmURL });
    
    try {
      // FFmpeg WASM 0.12.x - The "failed to import" error suggests the core.js file
      // is trying to do a dynamic import internally. This might be a version issue.
      // Try loading without specifying URLs first (uses default CDN), then fallback to local
      if (import.meta.env.DEV) console.log('Loading FFmpeg with local core files...');
      
      await ffmpeg.load({
        coreURL: cleanCoreJsURL,
        wasmURL: cleanCoreWasmURL,
      });
      
      if (import.meta.env.DEV) console.log('FFmpeg loaded successfully');
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
    
    // Build FFmpeg command based on output format
    const args = ['-i', inputName];

    // Memory management for FFmpeg WASM
    // Limit threads to reduce memory usage (WASM has limited threading support)
    args.push('-threads', '1');

    // Codec selection based on format; quality is a CRF passed straight through
    const crf = String(Math.round(options.quality));
    if (options.format === 'webm') {
      args.push('-c:v', 'libvpx-vp9');
      // VP9 constant-quality mode needs -b:v 0 for -crf to apply
      args.push('-crf', crf, '-b:v', '0');
      // VP9 memory optimizations for WASM
      args.push('-deadline', 'realtime'); // Faster encoding, less memory
      args.push('-cpu-used', '8'); // Maximum speed, minimum memory
      args.push('-row-mt', '0'); // Disable row-based multithreading (saves memory)
      args.push('-c:a', 'libopus');
    } else {
      // MP4 (default), MOV and AVI all use H.264 + AAC
      args.push('-c:v', 'libx264', '-c:a', 'aac');
      // Use faster preset for WASM (medium might be too slow)
      args.push('-preset', 'ultrafast', '-crf', crf);
      if (options.format !== 'avi') {
        args.push('-movflags', '+faststart'); // MP4/MOV only: optimize for web playback
      }
    }

    // Resolution: fit within max size, never upscale, keep even dimensions (H.264 needs them).
    // maintainAspectRatio=false scales to the exact size.
    if (options.maxWidth > 0 && options.maxHeight > 0) {
      const W = Math.round(options.maxWidth);
      const H = Math.round(options.maxHeight);
      args.push('-vf', options.maintainAspectRatio
        ? `scale='min(${W},iw)':'min(${H},ih)':force_original_aspect_ratio=decrease:flags=fast_bilinear,scale=trunc(iw/2)*2:trunc(ih/2)*2`
        : `scale=${W - (W % 2)}:${H - (H % 2)}:flags=fast_bilinear`);
    }

    // Add frame rate if specified
    if (options.fps) {
      args.push('-r', String(options.fps));
    }

    args.push(outputName);

    // Set up progress tracking (ffmpeg 0.12 reports 0..1, occasionally out of range)
    ffmpeg.on('progress', ({ progress: prog }) => {
      onProgress?.({ ratio: Math.min(Math.max(prog, 0), 1) });
    });

    // Run FFmpeg (0.12 resolves with the exit code instead of throwing)
    if (import.meta.env.DEV) console.log('FFmpeg command:', args.join(' '));
    let exitCode: number;
    try {
      exitCode = await ffmpeg.exec(args);
    } catch (execError) {
      console.error('FFmpeg exec error:', execError);
      throw new VideoProcessingError(
        `FFmpeg execution failed: ${execError instanceof Error ? execError.message : String(execError)}`,
        'processing',
        execError instanceof Error ? execError : undefined
      );
    }
    if (exitCode !== 0) {
      throw new VideoProcessingError(
        `FFmpeg exited with code ${exitCode}: ${logTail.join(' | ')}`,
        'processing'
      );
    }
    
    // Read output file
    let data: Uint8Array | string;
    try {
      data = await ffmpeg.readFile(outputName);
      if (import.meta.env.DEV) console.log('Output file read successfully, type:', typeof data, 'size:', data instanceof Uint8Array ? data.length : data.length);
    } catch (readError) {
      console.error('FFmpeg readFile error:', readError);
      // List files to debug
      try {
        const files = await ffmpeg.listDir('/');
        if (import.meta.env.DEV) console.log('Files in FFmpeg FS after exec:', files);
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

// Export types and error class
export { 
  VideoProcessingError, 
  type VideoCompressionOptions, 
  type ProcessingProgress, 
  type ProgressCallback 
};