import { getPerformanceMonitor } from './performanceMonitor.tsx';

// Enhanced error handling for audio processing
class AudioProcessingError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'AudioProcessingError';
  }
}

interface AudioDownloadOptions {
  quality: 'highest' | 'high' | 'medium' | 'low';
  format: 'mp3' | 'wav' | 'ogg' | 'aac' | 'm4a';
  maxDuration?: number; // in seconds
  startTime?: number; // in seconds
  endTime?: number; // in seconds
}

interface AudioConversionOptions {
  outputFormat: 'mp3' | 'wav' | 'ogg' | 'aac';
  bitrate: number; // kbps
  sampleRate: number; // Hz
  channels: 1 | 2; // mono or stereo
  quality: number; // 0-100
  normalize: boolean;
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
}

interface ProcessingProgress {
  stage: 'downloading' | 'extracting' | 'converting' | 'complete';
  progress: number;
  message: string;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number; // bytes per second
  eta?: number; // seconds
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// YouTube DL wrapper with enhanced error handling
const loadYoutubeDl = async () => {
  // Note: This would typically use a server-side API or a WASM version
  // For client-side, we'll simulate the functionality
  return {
    getInfo: async (url: string) => {
      // Simulate getting video/audio info
      const response = await fetch(`/api/audio/info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new AudioProcessingError('Failed to get audio info', 'info');
      }
      return response.json();
    },
    download: async (url: string, options: AudioDownloadOptions, onProgress?: ProgressCallback) => {
      // Simulate download with progress
      const response = await fetch('/api/audio/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options })
      });
      
      if (!response.ok) {
        throw new AudioProcessingError('Failed to download audio', 'downloading');
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new AudioProcessingError('No response body', 'downloading');
      }
      
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');
      let downloadedBytes = 0;
      const chunks: Uint8Array[] = [];
      const startTime = Date.now();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        downloadedBytes += value.length;
        
        if (onProgress && contentLength > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = downloadedBytes / elapsed;
          const eta = (contentLength - downloadedBytes) / speed;
          
          onProgress({
            stage: 'downloading',
            progress: (downloadedBytes / contentLength) * 100,
            message: `Downloading... ${Math.round(downloadedBytes / 1024 / 1024 * 100) / 100}MB`,
            downloadedBytes,
            totalBytes: contentLength,
            speed,
            eta
          });
        }
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new Blob([result], { type: 'audio/mpeg' });
    }
  };
};

// FFmpeg WASM loader with enhanced error handling
const loadFFmpeg = async () => {
  try {
    const ffmpeg = await import('@ffmpeg/ffmpeg');
    return ffmpeg;
  } catch (error) {
    throw new AudioProcessingError('Failed to load FFmpeg library', 'loading', error as Error);
  }
};

// Audio context manager for Web Audio API operations
class AudioContextManager {
  private audioContext: AudioContext | null = null;
  private maxDuration = 600; // 10 minutes max to prevent memory issues

  async getContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const context = await this.getContext();
    
    try {
      const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
      
      // Check duration limit
      if (audioBuffer.duration > this.maxDuration) {
        throw new AudioProcessingError(
          `Audio duration (${Math.round(audioBuffer.duration)}s) exceeds maximum allowed (${this.maxDuration}s)`,
          'validation'
        );
      }
      
      return audioBuffer;
    } catch (error) {
      if (error instanceof AudioProcessingError) {
        throw error;
      }
      throw new AudioProcessingError('Failed to decode audio data', 'decoding', error as Error);
    }
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    const context = this.audioContext;
    if (!context) {
      throw new AudioProcessingError('Audio context not initialized', 'initialization');
    }
    
    return context.createBuffer(channels, length, sampleRate);
  }

  cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Download audio from URL with enhanced error handling
export const downloadAudio = async (
  url: string,
  options: AudioDownloadOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('audioProcessor');
  
  try {
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Initializing download...' });
    
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new AudioProcessingError('Invalid URL provided', 'validation');
    }
    
    // Check if URL is supported (basic validation)
    const supportedDomains = ['youtube.com', 'youtu.be', 'soundcloud.com', 'vimeo.com'];
    const urlObj = new URL(url);
    const isSupported = supportedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );
    
    if (!isSupported) {
      throw new AudioProcessingError('Unsupported URL domain', 'validation');
    }
    
    onProgress?.({ stage: 'downloading', progress: 10, message: 'Loading downloader...' });
    
    const youtubeDl = await loadYoutubeDl();
    
    onProgress?.({ stage: 'downloading', progress: 20, message: 'Getting audio info...' });
    
    // Get audio info first
    const info = await youtubeDl.getInfo(url);
    
    // Validate duration if specified
    if (options.maxDuration && info.duration > options.maxDuration) {
      throw new AudioProcessingError(
        `Audio duration (${info.duration}s) exceeds maximum allowed (${options.maxDuration}s)`,
        'validation'
      );
    }
    
    onProgress?.({ stage: 'downloading', progress: 30, message: 'Starting download...' });
    
    // Download audio
    const audioBlob = await youtubeDl.download(url, options, (progress) => {
      if (progress.stage === 'downloading') {
        onProgress?.({
          ...progress,
          progress: 30 + (progress.progress * 0.6) // Scale to 30-90%
        });
      }
    });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Download complete!' });
    
    monitor.trackMemoryUsage('audioProcessor');
    return audioBlob;
    
  } catch (error) {
    console.error('Audio download failed:', error);
    
    if (error instanceof AudioProcessingError) {
      throw error;
    }
    
    throw new AudioProcessingError(
      `Unexpected error during audio download: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  } finally {
    endRender();
  }
};

// Convert audio format with enhanced error handling
export const convertAudio = async (
  audioFile: File | Blob,
  options: AudioConversionOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('audioProcessor');
  
  let audioManager: AudioContextManager | null = null;
  
  try {
    onProgress?.({ stage: 'extracting', progress: 0, message: 'Loading audio converter...' });
    
    // For client-side conversion, we'll use Web Audio API for basic operations
    // For advanced conversions, this would typically use FFmpeg WASM
    audioManager = new AudioContextManager();
    
    onProgress?.({ stage: 'extracting', progress: 20, message: 'Reading audio file...' });
    
    // Read audio file
    const arrayBuffer = await audioFile.arrayBuffer();
    
    onProgress?.({ stage: 'extracting', progress: 40, message: 'Decoding audio data...' });
    
    // Decode audio
    const audioBuffer = await audioManager.decodeAudioData(arrayBuffer);
    
    onProgress?.({ stage: 'converting', progress: 60, message: 'Processing audio...' });
    
    // Apply audio processing
    const processedBuffer = await processAudioBuffer(audioBuffer, options, audioManager);
    
    onProgress?.({ stage: 'converting', progress: 80, message: 'Encoding audio...' });
    
    // Encode to target format
    const outputBlob = await encodeAudioBuffer(processedBuffer, options);
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Conversion complete!' });
    
    monitor.trackMemoryUsage('audioProcessor');
    return outputBlob;
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Audio conversion failed:', error);
    }
    
    if (error instanceof AudioProcessingError) {
      throw error;
    }
    
    throw new AudioProcessingError(
      `Unexpected error during audio conversion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  } finally {
    audioManager?.cleanup();
    endRender();
  }
};

// Process audio buffer with various effects
const processAudioBuffer = async (
  inputBuffer: AudioBuffer,
  options: AudioConversionOptions,
  audioManager: AudioContextManager
): Promise<AudioBuffer> => {
  const { channels, sampleRate, normalize, fadeIn, fadeOut } = options;
  
  // Create output buffer
  const outputBuffer = audioManager.createBuffer(
    channels,
    inputBuffer.length,
    sampleRate
  );
  
  // Process each channel
  for (let channel = 0; channel < Math.min(channels, inputBuffer.numberOfChannels); channel++) {
    const inputData = inputBuffer.getChannelData(channel);
    const outputData = outputBuffer.getChannelData(channel);
    
    // Copy and process data
    for (let i = 0; i < inputData.length; i++) {
      let sample = inputData[i];
      
      // Apply fade in
      if (fadeIn && i < fadeIn * sampleRate) {
        const fadeProgress = i / (fadeIn * sampleRate);
        sample *= fadeProgress;
      }
      
      // Apply fade out
      if (fadeOut && i > inputData.length - (fadeOut * sampleRate)) {
        const fadeProgress = (inputData.length - i) / (fadeOut * sampleRate);
        sample *= fadeProgress;
      }
      
      outputData[i] = sample;
    }
    
    // Normalize if requested
    if (normalize) {
      normalizeChannel(outputData);
    }
  }
  
  return outputBuffer;
};

// Normalize audio channel
const normalizeChannel = (channelData: Float32Array) => {
  let max = 0;
  
  // Find peak
  for (let i = 0; i < channelData.length; i++) {
    max = Math.max(max, Math.abs(channelData[i]));
  }
  
  // Normalize if needed
  if (max > 0 && max < 1) {
    const scale = 0.95 / max; // Leave some headroom
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] *= scale;
    }
  }
};

// Encode audio buffer to target format
const encodeAudioBuffer = async (
  audioBuffer: AudioBuffer,
  options: AudioConversionOptions
): Promise<Blob> => {
  // For client-side encoding, we're limited to what the browser supports
  // This is a simplified implementation - real-world would use FFmpeg WASM
  
  const { outputFormat, bitrate, quality } = options;
  
  // Create offline audio context for rendering
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  
  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  // Render audio
  const renderedBuffer = await offlineContext.startRendering();
  
  // Convert to WAV (most compatible format for client-side)
  const wavBlob = audioBufferToWav(renderedBuffer);
  
  // For other formats, we would typically use FFmpeg WASM
  // For now, return WAV regardless of requested format
  return wavBlob;
};

// Convert AudioBuffer to WAV blob
const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

// Utility function to get optimal audio settings
export const getOptimalAudioSettings = (audioFile: File): AudioConversionOptions => {
  const sizeMB = audioFile.size / (1024 * 1024);
  
  // Adjust settings based on file size
  let bitrate = 128; // kbps
  let quality = 80;
  
  if (sizeMB > 50) {
    bitrate = 96;
    quality = 70;
  } else if (sizeMB > 20) {
    bitrate = 112;
    quality = 75;
  } else if (sizeMB < 5) {
    bitrate = 160;
    quality = 90;
  }
  
  return {
    outputFormat: 'mp3',
    bitrate,
    sampleRate: 44100,
    channels: 2,
    quality,
    normalize: true
  };
};

// Utility function to validate audio URL
export const validateAudioUrl = (url: string): { isValid: boolean; platform?: string; error?: string } => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check supported platforms
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { isValid: true, platform: 'YouTube' };
    }
    
    if (hostname.includes('soundcloud.com')) {
      return { isValid: true, platform: 'SoundCloud' };
    }
    
    if (hostname.includes('vimeo.com')) {
      return { isValid: true, platform: 'Vimeo' };
    }
    
    return { isValid: false, error: 'Unsupported platform' };
    
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

// Export types and error class
export { 
  AudioProcessingError, 
  type AudioDownloadOptions, 
  type AudioConversionOptions, 
  type ProcessingProgress, 
  type ProgressCallback 
};