/**
 * File validation utilities for various file types
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 50 * 1024 * 1024, // 50MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
  pdf: 100 * 1024 * 1024, // 100MB
  gif: 100 * 1024 * 1024, // 100MB
};

// Supported file types
const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
  video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'],
  audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'],
  pdf: ['application/pdf'],
  gif: ['image/gif'],
};

/**
 * Validate image files
 */
export const validateImageFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!SUPPORTED_TYPES.image.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format. Supported formats: ${SUPPORTED_TYPES.image.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.image) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZES.image / (1024 * 1024)}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

/**
 * Validate video files
 */
export const validateVideoFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!SUPPORTED_TYPES.video.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported video format. Supported formats: ${SUPPORTED_TYPES.video.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.video) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    const maxSizeMB = Math.round(MAX_FILE_SIZES.video / (1024 * 1024));
    return {
      isValid: false,
      error: `File too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB`
    };
  }

  // Check file extension matches MIME type
  if (!validateFileExtension(file)) {
    return {
      isValid: false,
      error: 'File extension does not match file type'
    };
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

// Legacy compatibility function for validation.ts interface
export const validateVideoFileLegacy = (file: File): string | null => {
  const result = validateVideoFile(file);
  return result.isValid ? null : result.error || 'Validation failed';
};

/**
 * Validate audio files
 */
export const validateAudioFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!SUPPORTED_TYPES.audio.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported audio format. Supported formats: ${SUPPORTED_TYPES.audio.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.audio) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZES.audio / (1024 * 1024)}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

/**
 * Validate PDF files
 */
export const validatePdfFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!SUPPORTED_TYPES.pdf.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file format. Expected PDF file.`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.pdf) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZES.pdf / (1024 * 1024)}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

/**
 * Validate GIF files
 */
export const validateGifFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!SUPPORTED_TYPES.gif.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file format. Expected GIF file.`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.gif) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZES.gif / (1024 * 1024)}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
};

/**
 * Generic file validation
 */
export const validateFile = (file: File, type: keyof typeof SUPPORTED_TYPES): ValidationResult => {
  switch (type) {
    case 'image':
      return validateImageFile(file);
    case 'video':
      return validateVideoFile(file);
    case 'audio':
      return validateAudioFile(file);
    case 'pdf':
      return validatePdfFile(file);
    case 'gif':
      return validateGifFile(file);
    default:
      return { isValid: false, error: 'Unknown file type' };
  }
};

/**
 * Validate multiple files
 */
export const validateFiles = (files: File[], type: keyof typeof SUPPORTED_TYPES): ValidationResult[] => {
  return files.map(file => validateFile(file, type));
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file extension matches MIME type
 */
export const validateFileExtension = (file: File): boolean => {
  const extension = getFileExtension(file.name);
  const mimeType = file.type;
  
  // Common extension to MIME type mappings
  const extensionMimeMap: Record<string, string[]> = {
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'webp': ['image/webp'],
    'bmp': ['image/bmp'],
    'tiff': ['image/tiff'],
    'mp4': ['video/mp4'],
    'avi': ['video/avi'],
    'mov': ['video/mov'],
    'wmv': ['video/wmv'],
    'flv': ['video/flv'],
    'webm': ['video/webm'],
    'mkv': ['video/mkv'],
    'mp3': ['audio/mp3', 'audio/mpeg'],
    'wav': ['audio/wav'],
    'ogg': ['audio/ogg'],
    'm4a': ['audio/m4a'],
    'aac': ['audio/aac'],
    'flac': ['audio/flac'],
    'pdf': ['application/pdf']
  };
  
  const expectedMimeTypes = extensionMimeMap[extension];
  return expectedMimeTypes ? expectedMimeTypes.includes(mimeType) : false;
};