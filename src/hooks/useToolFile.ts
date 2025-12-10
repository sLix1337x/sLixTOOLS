import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface UseToolFileOptions {
    onFileLoad?: (file: File) => void;
    onFileError?: (error: Error) => void;
    acceptedTypes?: string[];
    maxFileSize?: number;
    autoCreatePreview?: boolean;
}

export interface UseToolFileReturn {
    file: File | null;
    previewUrl: string | null;
    isLoading: boolean;
    error: string | null;
    handleFileSelect: (file: File | null) => void;
    clearFile: () => void;
    resetError: () => void;
}

/**
 * Custom hook for managing file uploads and previews in tool pages
 * Consolidates duplicate file handling logic across multiple tools
 * 
 * @param options - Configuration options for file handling
 * @returns File state and handler functions
 * 
 * @example
 * ```tsx
 * const { file, previewUrl, handleFileSelect, clearFile } = useToolFile({
 *   acceptedTypes: ['image/*'],
 *   maxFileSize: 50 * 1024 * 1024,
 *   onFileLoad: (file) => console.log('File loaded:', file.name)
 * });
 * ```
 */
export const useToolFile = (options: UseToolFileOptions = {}): UseToolFileReturn => {
    const {
        onFileLoad,
        onFileError,
        acceptedTypes = [],
        maxFileSize,
        autoCreatePreview = true
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

    const validate = useCallback((file: File): string | null => {
        // File size validation
        if (maxFileSize && file.size > maxFileSize) {
            return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`;
        }

        // Type validation
        if (acceptedTypes.length > 0) {
            const isAccepted = acceptedTypes.some(type => {
                if (type.endsWith('/*')) {
                    // Handle wildcards like 'image/*'
                    const category = type.split('/')[0];
                    return file.type.startsWith(category + '/');
                }
                return file.type === type;
            });

            if (!isAccepted) {
                return `File type ${file.type} is not accepted. Accepted types: ${acceptedTypes.join(', ')}`;
            }
        }

        return null;
    }, [acceptedTypes, maxFileSize]);

    const handleFileSelect = useCallback((selectedFile: File | null) => {
        setError(null);

        if (!selectedFile) {
            setFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            return;
        }

        setIsLoading(true);

        try {
            // Validate file
            const validationError = validate(selectedFile);
            if (validationError) {
                setError(validationError);
                const error = new Error(validationError);

                if (onFileError) {
                    onFileError(error);
                } else {
                    toast.error('Invalid File', { description: validationError });
                }

                setIsLoading(false);
                return;
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
    }, [validate, previewUrl, autoCreatePreview, onFileLoad, onFileError]);

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
        isLoading,
        error,
        handleFileSelect,
        clearFile,
        resetError
    };
};
