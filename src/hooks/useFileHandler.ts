import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { ValidationResult } from '@/types';

export interface FileHandlerOptions {
  maxFileSize?: number | undefined;
  supportedFormats?: string[] | undefined;
  validateFunction?: ((file: File) => ValidationResult) | undefined;
  onFileLoad?: ((file: File) => void) | undefined;
  onFileError?: ((error: Error, file?: File | undefined) => void) | undefined;
}

export interface FileHandlerState {
  file: File | null;
  fileUrl: string;
  isLoading: boolean;
  error: string | null;
}

export const useFileHandler = (options: FileHandlerOptions = {}) => {
  const [state, setState] = useState<FileHandlerState>({
    file: null,
    fileUrl: '',
    isLoading: false,
    error: null
  });

  // Cleanup URLs on unmount or when file changes
  useEffect(() => {
    return () => {
      if (state.fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
      }
    };
  }, [state.fileUrl]);

  const validateFile = useCallback((file: File): ValidationResult => {
    // Use custom validation function if provided
    if (options.validateFunction) {
      return options.validateFunction(file);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic file checks
    if (!file) {
      errors.push('No file selected');
      return { isValid: false, error: 'No file selected' };
    }
    
    // Size validation
    if (file.size === 0) {
      errors.push('File appears to be empty');
    } else if (options.maxFileSize && file.size > options.maxFileSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${options.maxFileSize / 1024 / 1024}MB`);
    } else if (file.size > 100 * 1024 * 1024) { // 100MB warning
      warnings.push('Large file size may result in slower processing');
    }
    
    // Format validation
    if (options.supportedFormats) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        errors.push('File has no extension');
      } else if (!options.supportedFormats.includes(fileExtension)) {
        errors.push(`Unsupported file format: .${fileExtension}. Supported formats: ${options.supportedFormats.join(', ')}`);
      }
    }
    
    // File name validation
    if (file.name.length > 255) {
      warnings.push('File name is very long and may cause issues');
    }
    
    const result: ValidationResult = {
      isValid: errors.length === 0
    };
    
    if (errors.length > 0) {
      result.error = errors[0];
    }
    
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    
    return result;
  }, [options]);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) {
      setState(prev => ({ ...prev, file: null, error: null }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate file
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        const error = new Error(validation.error || 'File validation failed');
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
        
        if (options.onFileError) {
          options.onFileError(error, file);
        } else {
          toast.error('File Validation Failed', {
            description: error.message
          });
        }
        return;
      }
      
      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast.warning('File Warning', {
            description: warning
          });
        });
      }

      // Clean up previous URL
      if (state.fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
      }

      // Create new URL
      const url = URL.createObjectURL(file);
      
      setState(prev => ({
        ...prev,
        file,
        fileUrl: url,
        isLoading: false,
        error: null
      }));

      // Call success callback
      if (options.onFileLoad) {
        options.onFileLoad(file);
      } else {
        toast.success('File loaded successfully!');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      if (options.onFileError) {
        options.onFileError(error instanceof Error ? error : new Error(errorMessage), file);
      } else {
        toast.error('File Loading Failed', {
          description: errorMessage
        });
      }
    }
  }, [validateFile, state.fileUrl, options]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileSelect(file);
  }, [handleFileSelect]);

  const clearFile = useCallback(() => {
    if (state.fileUrl) {
      URL.revokeObjectURL(state.fileUrl);
    }
    setState({
      file: null,
      fileUrl: '',
      isLoading: false,
      error: null
    });
  }, [state.fileUrl]);

  const createDownloadLink = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Download started!');
  }, []);

  return {
    ...state,
    handleFileSelect,
    handleFileInputChange,
    clearFile,
    createDownloadLink,
    validateFile
  };
};