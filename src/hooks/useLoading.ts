import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading states with optional error handling
 * @param initialState - Initial loading state (default: false)
 * @returns Object containing loading state, setters, and utility functions
 */
export const useLoading = (initialState: boolean = false) => {
  const [isLoading, setIsLoading] = useState<boolean>(initialState);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start loading state and clear any existing errors
   */
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  /**
   * Stop loading state
   */
  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  /**
   * Stop loading and set an error message
   * @param errorMessage - Error message to set
   */
  const stopWithError = useCallback((errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
  }, []);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute an async function with automatic loading state management
   * @param asyncFn - Async function to execute
   * @returns Promise that resolves with the function result or rejects with error
   */
  const executeWithLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFn();
      stopLoading();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      stopWithError(errorMessage);
      throw err;
    }
  }, [startLoading, stopLoading, stopWithError]);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    stopWithError,
    clearError,
    executeWithLoading,
    // Legacy compatibility
    setIsLoading: setIsLoading,
  };
};

export default useLoading;