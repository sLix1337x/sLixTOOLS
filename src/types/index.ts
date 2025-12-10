// Centralized type definitions for the GIF Maker project

export interface ConversionOptions {
  fps: number;
  quality: number;
  trimEnabled: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
  width?: number;
  height?: number;
}

export interface VideoFile {
  file: File;
  url: string;
  duration: number;
}

export interface GifResult {
  blob: Blob;
  url: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ToolItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path?: string;
  category: string;
  featured?: boolean;
  comingSoon?: boolean;
}

// Component Props Types
export interface VideoPreviewProps {
  file: File | null;
  onDurationChange?: (duration: number) => void;
}

export interface GifPreviewProps {
  gifBlob: Blob | null;
  onDownload: () => void;
  isConverting: boolean;
}

export interface ConversionOptionsProps {
  options: ConversionOptions;
  onOptionsChange: (options: ConversionOptions) => void;
  videoDuration: number;
  videoFile?: File | null;
}

export interface FileUploadProps {
  onFileSelected: (file: File) => void;
  acceptedFormats?: string[];
  maxSizeInMB?: number;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Processing Types
export interface ProcessingProgress {
  stage: 'initializing' | 'processing' | 'finalizing' | 'complete';
  percentage: number;
  message?: string;
}

export interface ProcessingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// File Processing Types
export interface FileProcessingOptions {
  quality: number;
  maxSize?: number;
  format?: string;
  compression?: number;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  fileSize: {
    input: number;
    output: number;
  };
}

// Processing state type
export type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

// Tool-specific result types
export interface ToolProcessingResult<T = Blob> {
  data: T;
  size: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
