// Validation utilities for file uploads and user inputs

import { ValidationResult } from '@/types';
import { config } from '@/config';

export const MAX_FILE_SIZE = config.upload.maxFileSize;
export const ALLOWED_VIDEO_TYPES = config.upload.allowedVideoTypes;
export const ALLOWED_IMAGE_TYPES = config.upload.allowedImageTypes;

export const validateVideoFile = (file: File): ValidationResult => {
  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please upload MP4, WebM, or OGG video files.' 
    };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return { 
      valid: false, 
      error: `File too large (${sizeMB}MB). Maximum size is 100MB.` 
    };
  }
  
  // Check file name for security
  const fileName = file.name;
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  if (invalidChars.test(fileName)) {
    return { 
      valid: false, 
      error: 'File name contains invalid characters.' 
    };
  }
  
  return { valid: true };
};

export const validateImageFile = (file: File): ValidationResult => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.' 
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return { 
      valid: false, 
      error: `File too large (${sizeMB}MB). Maximum size is 100MB.` 
    };
  }
  
  return { valid: true };
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove invalid characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Ensure it has a valid extension
  if (!sanitized.includes('.')) {
    sanitized += '.unknown';
  }
  
  return sanitized;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
