import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { ValidationResult } from '@/types';

export interface UseToolFileOptions {
    /** Callback when file is successfully loaded */
    onFileLoad?: (file: File) => void;
    /** Callback when file loading fails */
    onFileError?: (error: Error) => void;
    /** Accepted MIME types (e.g., ['image/*', 'video/mp4']) */
    acceptedTypes?: string[];
    /** Maximum file size in bytes */
    maxFileSize?: number;
    /** Automatically create object URL for preview */
    autoCreatePreview?: boolean;
    /** Custom validation function (takes precedence over built-in validation) */
    validateFunction?: (file: File) => ValidationResult;
    /** Supported file extensions (alternative to acceptedTypes, e.g., ['mp4', 'webm']) */
    supportedFormats?: string[];
}

export interface UseToolFileReturn {
    /** The selected file */
    file: File | null;
    /** Object URL for file preview (alias: fileUrl for backwards compatibility) */
    previewUrl: string | null;
    /** Alias for previewUrl - backwards compatibility with useFileHandler */
    fileUrl: string;
    /** Whether file is being loaded/validated */
    isLoading: boolean;
    /** Current error message if any */
    error: string | null;
    /** Handle file selection from input or drop */
    handleFileSelect: (file: File | null) => void;
    /** Handle file input change event */
    handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** Clear the current file */
    clearFile: () => void;
    /** Reset error state */
    resetError: () => void;
    /** Validate a file without selecting it */
    validateFile: (file: File) => ValidationResult;
}

/**
 * Unified hook for managing file uploads and previews in tool pages.
 * Consolidates duplicate file handling logic across multiple tools.
 * 
 * @param options - Configuration options for file handling
 * @returns File state and handler functions
 * 
 * @example
 * ```tsx
 * // Using MIME types
 * const { file, previewUrl, handleFileSelect } = useToolFile({
 *   acceptedTypes: ['image/*'],
 *   maxFileSize: 50 * 1024 * 1024,
 *   onFileLoad: (file) => console.log('File loaded:', file.name)
 * });
 * 
 * // Using custom validation function
 * const { file, fileUrl, handleFileSelect } = useToolFile({
 *   validateFunction: validateVideoFile,
 *   onFileError: (error) => toast.error(error.message)
 * });
 * ```
 */
export const useToolFile = (options: UseToolFileOptions = {}): UseToolFileReturn => {
    const {
        onFileLoad,
        onFileError,
        acceptedTypes = [],
        maxFileSize,
        autoCreatePreview = true,
        validateFunction,
        supportedFormats = []
    } = options;

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cleanup preview URLs on unmount or when previewUrl changes
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const validateFile = useCallback((file: File): ValidationResult => {
        // Use custom validation function if provided (takes precedence)
        if (validateFunction) {
            return validateFunction(file);
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic file checks
        if (!file) {
            return { isValid: false, error: 'No file selected' };
        }

        // File size validation
        if (file.size === 0) {
            errors.push('File appears to be empty');
        } else if (maxFileSize && file.size > maxFileSize) {
            errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`);
        } else if (file.size > 100 * 1024 * 1024) {
            warnings.push('Large file size may result in slower processing');
        }

        // MIME type validation (acceptedTypes)
        if (acceptedTypes.length > 0) {
            const isAccepted = acceptedTypes.some(type => {
                if (type.endsWith('/*')) {
                    const category = type.split('/')[0];
                    return file.type.startsWith(category + '/');
                }
                return file.type === type;
            });

            if (!isAccepted) {
                errors.push(`File type ${file.type || 'unknown'} is not accepted. Accepted types: ${acceptedTypes.join(', ')}`);
            }
        }

        // Extension validation (supportedFormats)
        if (supportedFormats.length > 0) {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (!fileExtension) {
                errors.push('File has no extension');
            } else if (!supportedFormats.includes(fileExtension)) {
                errors.push(`Unsupported file format: .${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`);
            }
        }

        // File name validation
        if (file.name.length > 255) {
            warnings.push('File name is very long and may cause issues');
        }

        const result: ValidationResult = {
            isValid: errors.length === 0,
            fileInfo: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }
        };

        if (errors.length > 0) {
            result.error = errors[0];
        }

        if (warnings.length > 0) {
            result.warnings = warnings;
        }

        return result;
    }, [validateFunction, acceptedTypes, maxFileSize, supportedFormats]);

    const handleFileSelect = useCallback((selectedFile: File | null) => {
        setError(null);

        if (!selectedFile) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setFile(null);
            setPreviewUrl(null);
            return;
        }

        setIsLoading(true);

        try {
            // Validate file
            const validation = validateFile(selectedFile);
            
            if (!validation.isValid) {
                setError(validation.error || 'File validation failed');
                const errorObj = new Error(validation.error || 'File validation failed');

                if (onFileError) {
                    onFileError(errorObj);
                } else {
                    toast.error('Invalid File', { description: validation.error });
                }

                setIsLoading(false);
                return;
            }

            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    toast.warning('File Warning', { description: warning });
                });
            }

            // Clean up previous preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            // Create new preview URL if needed
            let newPreviewUrl: string | null = null;
            if (autoCreatePreview) {
                newPreviewUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(newPreviewUrl);
            }

            setFile(selectedFile);

            // Call success callback
            if (onFileLoad) {
                onFileLoad(selectedFile);
            } else {
                toast.success('File loaded successfully!');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
            setError(errorMessage);

            if (onFileError) {
                onFileError(err instanceof Error ? err : new Error(errorMessage));
            } else {
                toast.error('File Loading Failed', { description: errorMessage });
            }
        } finally {
            setIsLoading(false);
        }
    }, [validateFile, previewUrl, autoCreatePreview, onFileLoad, onFileError]);

    const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        handleFileSelect(file);
    }, [handleFileSelect]);

    const clearFile = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setPreviewUrl(null);
        setError(null);
    }, [previewUrl]);

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return {
        file,
        previewUrl,
        fileUrl: previewUrl || '', // Backwards compatibility alias
        isLoading,
        error,
        handleFileSelect,
        handleFileInputChange,
        clearFile,
        resetError,
        validateFile
    };
};

/**
 * @deprecated Use useToolFile instead. This is an alias for backwards compatibility.
 */
export const useFileHandler = useToolFile;
