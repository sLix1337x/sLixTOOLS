/**
 * Centralized file validation utilities for all file types
 * Consolidates validation logic from components and hooks
 */

import type { ValidationResult } from '../types';
import { config } from '../config';
import { bytesToMB } from './formatters';

// Maximum file sizes (in bytes) - using centralized config
const MAX_FILE_SIZES = {
  image: 50 * 1024 * 1024, // 50MB for images
  video: config.upload.maxFileSize, // Use config value for videos
  general: 100 * 1024 * 1024, // 100MB general limit
};

// Browsers report '' or vendor MIMEs for many video containers, so videos are validated by extension
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'avi', 'mpeg', 'mpg', 'mkv', 'flv', 'ogg', 'ogv', 'mov', 'm4v', 'wmv', 'asf', '3gp', '3gpp'];

// File validation options interface with strict typing
export interface FileValidationOptions {
  maxFileSize?: number;
  supportedFormats?: readonly string[];
  allowEmpty?: boolean;
  customValidation?: (file: File) => ValidationResult;
  strictTypeChecking?: boolean;
  validateContent?: boolean;
}

// Enhanced validation result with warnings and strict typing
export interface EnhancedValidationResult {
  isValid: boolean;
  error?: string | undefined;
  warnings?: readonly string[] | undefined;
  validatedType?: string;
  actualSize?: number;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | undefined;
}

/**
 * Universal file validation function that consolidates all validation logic
 * Replaces duplicate validateFile functions across components
 */
export const validateFile = (file: File, options: FileValidationOptions = {}): EnhancedValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Use custom validation if provided
  if (options.customValidation) {
    return options.customValidation(file);
  }
  
  // Basic file checks
  if (!file) {
    errors.push('No file selected');
    return { isValid: false, error: 'No file selected' };
  }
  
  // Empty file check
  if (file.size === 0 && !options.allowEmpty) {
    errors.push('File appears to be empty');
  }
  
  // Size validation
  const maxSize = options.maxFileSize || MAX_FILE_SIZES.general;
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    errors.push(`File size (${fileSizeMB}MB) exceeds maximum limit of ${maxSizeMB}MB`);
  } else if (file.size > 50 * 1024 * 1024) { // 50MB warning threshold
    warnings.push('Large file size may result in slower processing');
  }
  
  // Format validation
  if (options.supportedFormats && options.supportedFormats.length > 0) {
    const fileExtension = getFileExtension(file.name);
    const fileMimeType = file.type;
    
    // Check if file matches any supported format
    const isSupported = options.supportedFormats.some(format => {
      // If format is a MIME type pattern (contains '/')
      if (format.includes('/')) {
        // Handle wildcard MIME types like 'video/*'
        if (format.endsWith('/*')) {
          const baseType = format.slice(0, -2); // Remove '/*'
          return fileMimeType.startsWith(baseType + '/');
        }
        // Exact MIME type match
        return fileMimeType === format;
      }
      // If format is a file extension (starts with '.')
      if (format.startsWith('.')) {
        return '.' + fileExtension === format.toLowerCase();
      }
      // If format is an extension without dot, add it
      return '.' + fileExtension === '.' + format.toLowerCase();
    });
    
    if (!isSupported) {
      errors.push(`Unsupported file format. Supported formats: ${options.supportedFormats.join(', ')}`);
    }
  }
  
  // Extension validation
  if (!validateFileExtension(file)) {
    warnings.push('File extension may not match file type');
  }
  
  // Return result
  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; '),
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
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
  const isVideoMime = file.type === '' || file.type.startsWith('video/');
  if (!isVideoMime || !VIDEO_EXTENSIONS.includes(getFileExtension(file.name))) {
    return {
      isValid: false,
      error: `Unsupported video format. Supported formats: ${VIDEO_EXTENSIONS.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.video) {
    const sizeMB = Math.round(bytesToMB(file.size));
    const maxSizeMB = Math.round(bytesToMB(MAX_FILE_SIZES.video));
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

// Unused validation functions removed for bundle optimization

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
};

/**
 * Check if file extension matches MIME type (unknown extensions pass)
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
    'avi': ['video/avi', 'video/x-msvideo'],
    'mov': ['video/mov', 'video/quicktime'],
    'wmv': ['video/wmv', 'video/x-ms-wmv'],
    'flv': ['video/flv', 'video/x-flv'],
    'webm': ['video/webm'],
    'mkv': ['video/mkv', 'video/x-matroska']
  };
  
  const expectedMimeTypes = extensionMimeMap[extension];
  // Unknown extensions (avif, svg, heic, jfif, ...) are not ours to judge
  return expectedMimeTypes ? expectedMimeTypes.includes(mimeType) : true;
};