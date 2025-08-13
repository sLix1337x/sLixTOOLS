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
};

// Supported file types
const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
  video: ['video/mp4', 'video/webm', 'video/avi', 'video/mpeg', 'video/mkv', 'video/flv', 'video/ogg', 'video/mov', 'video/m4v', 'video/wmv', 'video/asf', 'video/3gpp', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'],
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

// Unused validation functions removed for bundle optimization

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
    'mkv': ['video/mkv']
  };
  
  const expectedMimeTypes = extensionMimeMap[extension];
  return expectedMimeTypes ? expectedMimeTypes.includes(mimeType) : false;
};