import * as React from 'react';
import { ErrorBoundaryProps } from '../types/errorBoundary';

export interface ErrorReport {
  errorId: string;
  timestamp: number;
  error: string;
  stack?: string | undefined;
  componentStack?: string | undefined;
  userAgent: string;
  url: string;
  userId?: string | undefined;
  performanceMetrics?: Record<string, unknown> | undefined;
}

// Enhanced error logging with validation
const logError = (context: string, error: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ErrorBoundary] ${context}:`, error);
  }
};

// Validate error report data
const validateErrorReport = (report: Partial<ErrorReport>): report is ErrorReport => {
  return !!(
    report.errorId &&
    report.timestamp &&
    report.error &&
    report.userAgent &&
    report.url
  );
};

// Enhanced HOC for file processing error boundary with validation
export const withFileProcessingErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _errorBoundaryProps: Partial<ErrorBoundaryProps> = {}
) => {
  if (!Component) {
    logError('withFileProcessingErrorBoundary', new Error('Component is required'));
    return () => React.createElement('div', {}, 'Component Error');
  }

  const WrappedComponent = React.forwardRef<unknown, P>((props, ref) => {
    try {
      const componentProps = ref ? { ...props, ref } : props;
      return React.createElement(Component, componentProps as P & { ref?: React.Ref<unknown> });
    } catch (error) {
      logError('Component render failed', error);
      return React.createElement('div', {}, 'Render Error');
    }
  });

  WrappedComponent.displayName = `withFileProcessingErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};

// Enhanced general error boundary HOC with validation
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _errorBoundaryProps: Partial<ErrorBoundaryProps> = {}
) => {
  if (!Component) {
    logError('withErrorBoundary', new Error('Component is required'));
    return () => React.createElement('div', {}, 'Component Error');
  }

  const WrappedComponent = React.forwardRef<unknown, P>((props, ref) => {
    try {
      const componentProps = ref ? { ...props, ref } : props;
      return React.createElement(Component, componentProps as P & { ref?: React.Ref<unknown> });
    } catch (error) {
      logError('Component render failed', error);
      return React.createElement('div', {}, 'Render Error');
    }
  });

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};

// Enhanced error handler hook with validation
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    try {
      if (!error) {
        logError('useErrorHandler', new Error('Error object is required'));
        return;
      }

      const errorReport: ErrorReport = {
        errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        error: error.message || 'Unknown error',
        stack: error.stack,
        componentStack: errorInfo?.componentStack || undefined,
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Unknown',
        url: (typeof window !== 'undefined' && window.location.href) ? window.location.href : 'Unknown',
      };

      storeErrorReport(errorReport);
    } catch (handlerError) {
      logError('Error handler failed', handlerError);
    }
  }, []);

  return { handleError };
};

// Enhanced error report storage with validation
const storeErrorReport = (report: ErrorReport): void => {
  try {
    if (!validateErrorReport(report)) {
      logError('Invalid error report', report);
      return;
    }

    if (typeof localStorage === 'undefined') {
      logError('localStorage not available', new Error('Storage unavailable'));
      return;
    }

    const existingReports = getStoredErrorReports();
    const updatedReports = [...existingReports, report].slice(-10); // Keep only last 10

    localStorage.setItem('error_reports', JSON.stringify(updatedReports));
  } catch (error) {
    logError('Failed to store error report', error);
  }
};

// Enhanced utility to get stored error reports with validation
export const getStoredErrorReports = (): ErrorReport[] => {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const stored = localStorage.getItem('error_reports');
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      logError('Invalid stored error reports format', parsed);
      return [];
    }

    // Validate each report
    return parsed.filter((report: unknown) => {
      if (typeof report === 'object' && report !== null) {
        return validateErrorReport(report as Partial<ErrorReport>);
      }
      return false;
    });
  } catch (error) {
    logError('Failed to get stored error reports', error);
    return [];
  }
};

// Enhanced utility to clear stored error reports with validation
export const clearStoredErrorReports = (): boolean => {
  try {
    if (typeof localStorage === 'undefined') {
      logError('localStorage not available for clearing', new Error('Storage unavailable'));
      return false;
    }

    localStorage.removeItem('error_reports');
    return true;
  } catch (error) {
    logError('Failed to clear stored error reports', error);
    return false;
  }
};