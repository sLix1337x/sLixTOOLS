import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRecovering: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  enableRecovery?: boolean;
  showErrorDetails?: boolean;
  componentName?: string;
}

interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  timing?: {
    navigationStart?: number;
    loadEventEnd?: number;
    domContentLoadedEventEnd?: number;
  };
  [key: string]: unknown;
}

interface ErrorReport {
  errorId: string;
  timestamp: number;
  error: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  performanceMetrics?: PerformanceMetrics;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;
    
    this.setState({ errorInfo });
    
    // Log error
    this.logError(error, errorInfo);
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Auto-retry if enabled
    if (this.props.enableRecovery && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorReport: ErrorReport = {
      errorId: this.state.errorId,
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error [${errorReport.errorId}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
    
    // Store error report for potential submission
    this.storeErrorReport(errorReport);
  }

  private storeErrorReport(report: ErrorReport) {
    try {
      const existingReports = JSON.parse(
        localStorage.getItem('error_reports') || '[]'
      );
      
      existingReports.push(report);
      
      // Keep only last 10 reports
      const recentReports = existingReports.slice(-10);
      
      localStorage.setItem('error_reports', JSON.stringify(recentReports));
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to store error report:', e);
      }
    }
  }

  private scheduleRetry() {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    this.setState({ isRecovering: true });
    
    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));
    }, delay);
    
    this.retryTimeouts.push(timeout);
  }

  private handleManualRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error) return;
    
    const subject = encodeURIComponent(`Error Report: ${errorId}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack}\n` +
      `Component Stack: ${errorInfo?.componentStack}\n` +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  render() {
    const { hasError, error, isRecovering, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, showErrorDetails = false } = this.props;
    
    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }
      
      // Show recovery state
      if (isRecovering) {
        return (
          <div className="flex items-center justify-center min-h-[200px] p-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-medium">Recovering...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Attempting to restore the component
              </p>
            </div>
          </div>
        );
      }
      
      // Show error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Don't worry, we're working to fix it.
              </p>
            </div>
            
            {showErrorDetails && (
              <div className="bg-muted p-4 rounded-lg text-left">
                <h3 className="font-medium mb-2">Error Details:</h3>
                <p className="text-sm font-mono text-red-600 break-all">
                  {error.message}
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Stack Trace
                    </summary>
                    <pre className="text-xs mt-2 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {retryCount < maxRetries && (
                <Button onClick={this.handleManualRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              
              <Button variant="outline" onClick={this.handleReload} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              
              <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={this.handleReportError}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Bug className="h-4 w-4" />
                Report this error
              </Button>
            </div>
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempts: {retryCount}/{maxRetries}
              </p>
            )}
          </div>
        </div>
      );
    }
    
    return children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = React.forwardRef<React.ComponentRef<typeof Component>, P>((props, ref) => (
    <ErrorBoundary 
      {...errorBoundaryProps}
      componentName={Component.displayName || Component.name}
    >
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for error reporting from functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    // Create a synthetic error boundary-like report
    const errorReport: ErrorReport = {
      errorId: `hook_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack || 'Unknown',
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by useErrorHandler:', error);
    }
    
    // Store error report
    try {
      const existingReports = JSON.parse(
        localStorage.getItem('error_reports') || '[]'
      );
      existingReports.push(errorReport);
      localStorage.setItem('error_reports', JSON.stringify(existingReports.slice(-10)));
    } catch (e) {
      console.warn('Failed to store error report:', e);
    }
  }, []);
  
  return { handleError };
};

// Utility to get stored error reports
export const getStoredErrorReports = (): ErrorReport[] => {
  try {
    return JSON.parse(localStorage.getItem('error_reports') || '[]');
  } catch (e) {
    return [];
  }
};

// Utility to clear stored error reports
export const clearStoredErrorReports = () => {
  try {
    localStorage.removeItem('error_reports');
  } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to clear error reports:', e);
      }
    }
};

export default ErrorBoundary;