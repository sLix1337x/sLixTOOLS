// Centralized type definitions for the GIF Maker project

export interface ConversionOptions {
  fps: number;
  quality: number;
  trimEnabled: boolean;
  startTime: number;
  endTime: number;
  duration: number;
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
  valid: boolean;
  error?: string;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
