import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Options for URL file loading
 */
export interface UrlFileLoaderOptions {
    expectedType?: 'image' | 'video' | 'audio' | 'document';
    maxFileSize?: number;
    onSuccess?: (file: File) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook for loading files from URLs
 * Provides loading state and error handling
 * 
 * @param options - Configuration options
 * @returns Object with loadFromUrl function and loading state
 */
export const useUrlFileLoader = (options: UrlFileLoaderOptions = {}) => {
    const [isLoading, setIsLoading] = useState(false);

    const loadFromUrl = useCallback(async (url: string): Promise<File | null> => {
        if (!url.trim()) {
            toast.error('Please enter a valid URL');
            return null;
        }

        setIsLoading(true);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();

            // Type validation
            if (options.expectedType) {
                if (!blob.type.startsWith(`${options.expectedType}/`)) {
                    throw new Error(`Invalid file type. Expected ${options.expectedType}, got ${blob.type}`);
                }
            }

            // Size validation
            if (options.maxFileSize && blob.size > options.maxFileSize) {
                const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
                const maxMB = (options.maxFileSize / 1024 / 1024).toFixed(0);
                throw new Error(`File too large (${sizeMB}MB). Maximum: ${maxMB}MB`);
            }

            // Extract filename from URL or use default
            const urlPath = new URL(url).pathname;
            const filename = urlPath.split('/').pop() || `file-from-url.${blob.type.split('/')[1]}`;

            const file = new File([blob], filename, { type: blob.type });

            toast.success('File loaded from URL');
            options.onSuccess?.(file);

            return file;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to load from URL');
            toast.error(err.message);
            options.onError?.(err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    return { loadFromUrl, isLoading };
};
