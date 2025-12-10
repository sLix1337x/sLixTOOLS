import { useState, useCallback } from 'react';

/**
 * Processing state enum
 */
export type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

/**
 * Options for the processing state hook
 */
export interface ProcessingStateOptions {
    onComplete?: () => void;
    onError?: (error: Error) => void;
    resetDelay?: number;
}

/**
 * Hook for managing processing state in tool pages
 * Provides standardized state management for file processing operations
 * 
 * @param options - Configuration options
 * @returns Object with state, progress, and control functions
 */
export const useProcessingState = (options: ProcessingStateOptions = {}) => {
    const [state, setState] = useState<ProcessingState>('idle');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const startProcessing = useCallback(() => {
        setState('processing');
        setProgress(0);
        setIsProcessing(true);
    }, []);

    const updateProgress = useCallback((value: number) => {
        setProgress(Math.max(0, Math.min(100, value)));
    }, []);

    const completeProcessing = useCallback(() => {
        setState('completed');
        setProgress(100);
        setIsProcessing(false);
        options.onComplete?.();
    }, [options]);

    const errorProcessing = useCallback((error?: Error) => {
        setState('error');
        setIsProcessing(false);
        options.onError?.(error || new Error('Processing failed'));

        // Auto-reset to idle after delay
        if (options.resetDelay) {
            setTimeout(() => setState('idle'), options.resetDelay);
        }
    }, [options]);

    const resetProcessing = useCallback(() => {
        setState('idle');
        setProgress(0);
        setIsProcessing(false);
    }, []);

    return {
        state,
        progress,
        isProcessing,
        startProcessing,
        updateProgress,
        completeProcessing,
        errorProcessing,
        resetProcessing
    };
};
