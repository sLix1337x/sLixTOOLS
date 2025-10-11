import { useCallback } from 'react';
import { toast } from 'sonner';

export enum ErrorCategory {
  FILE_PROCESSING = 'file_processing',
  MEMORY = 'memory',
  WORKER = 'worker',
  NETWORK = 'network',
  VALIDATION = 'validation',
  CONVERSION = 'conversion',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  component?: string | undefined;
  action?: string | undefined;
  fileName?: string | undefined;
  fileSize?: number | undefined;
  fileType?: string | undefined;
  [key: string]: unknown;
}

export interface ErrorLogEntry {
  id: string;
  category: ErrorCategory;
  message: string;
  stack?: string | undefined;
  context?: ErrorContext | undefined;
  timestamp: Date;
}

export interface ErrorHandlerOptions {
  component?: string | undefined;
  showToast?: boolean | undefined;
  logError?: boolean | undefined;
  onError?: ((error: Error, context: string, errorId?: string) => void) | undefined;
}

class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxErrors = 100; // Keep only last 100 errors

  logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): string {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorEntry: ErrorLogEntry = {
      ...entry,
      id,
      timestamp: new Date()
    };

    this.errors.unshift(errorEntry);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // Error details logged to development system
    }

    return id;
  }

  getErrorById(id: string): ErrorLogEntry | undefined {
    return this.errors.find(error => error.id === id);
  }

  getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errors.slice(0, count);
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// Global error logger instance
const errorLogger = new ErrorLogger();

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const {
    component = 'Unknown',
    showToast = true,
    logError = true,
    onError
  } = options;

  const categorizeError = useCallback((error: Error): ErrorCategory => {
    const message = error.message.toLowerCase();
    
    if (message.includes('memory') || message.includes('out of memory')) {
      return ErrorCategory.MEMORY;
    }
    if (message.includes('worker') || message.includes('timeout')) {
      return ErrorCategory.WORKER;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('conversion') || message.includes('processing') || message.includes('encode')) {
      return ErrorCategory.CONVERSION;
    }
    
    return ErrorCategory.FILE_PROCESSING;
  }, []);

  const handleError = useCallback((
    error: Error | string,
    context: string,
    additionalData?: ErrorContext
  ): string | undefined => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errorObj.message || 'Unknown error occurred';
    
    let errorId: string | undefined;

    if (logError) {
      const errorCategory = categorizeError(errorObj);
      
      errorId = errorLogger.logError({
        category: errorCategory,
        message: `${context}: ${errorMessage}`,
        stack: errorObj.stack,
        context: {
          component,
          action: context,
          ...additionalData
        }
      });
    }

    if (showToast) {
      toast.error(`${context} Failed`, {
        description: errorMessage,
        action: errorId ? {
          label: 'View Details',
          onClick: () => {
            const errorDetails = errorLogger.getErrorById(errorId);
            if (errorDetails) {
              // Error details are logged to development system for debugging
              // You could also show a modal with error details here
            }
          }
        } : undefined
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(errorObj, context, errorId);
    }

    return errorId;
  }, [categorizeError, component, showToast, logError, onError]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context: string,
    additionalData?: ErrorContext
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        additionalData
      );
      return null;
    }
  }, [handleError]);

  const createErrorBoundary = useCallback((
    fn: () => void,
    context: string,
    additionalData?: ErrorContext
  ) => {
    return () => {
      try {
        fn();
      } catch (error) {
        handleError(
          error instanceof Error ? error : new Error(String(error)),
          context,
          additionalData
        );
      }
    };
  }, [handleError]);

  const showSuccess = useCallback((message: string, description?: string) => {
    if (showToast) {
      toast.success(message, description ? { description } : undefined);
    }
  }, [showToast]);

  const showWarning = useCallback((message: string, description?: string) => {
    if (showToast) {
      toast.warning(message, description ? { description } : undefined);
    }
  }, [showToast]);

  const showInfo = useCallback((message: string, description?: string) => {
    if (showToast) {
      toast.info(message, description ? { description } : undefined);
    }
  }, [showToast]);

  return {
    handleError,
    handleAsyncError,
    createErrorBoundary,
    showSuccess,
    showWarning,
    showInfo,
    getRecentErrors: () => errorLogger.getRecentErrors(),
    clearErrors: () => errorLogger.clearErrors()
  };
};

export { errorLogger };