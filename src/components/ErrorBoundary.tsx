import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug, FileX, Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
  // File processing specific props
  isFileProcessing?: boolean;
  showDetailedError?: boolean;
}

interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize?: number | undefined;
    totalJSHeapSize?: number | undefined;
    jsHeapSizeLimit?: number | undefined;
  } | undefined;
  timing?: {
    navigationStart?: number | undefined;
    loadEventEnd?: number | undefined;
    domContentLoadedEventEnd?: number | undefined;
  } | undefined;
  [key: string]: unknown;
}

interface ErrorReport {
  errorId: string;
  timestamp: number;
  error: string;
  stack?: string | undefined;
  componentStack?: string | undefined;
  userAgent: string;
  url: string;
  userId?: string | undefined;
  performanceMetrics?: PerformanceMetrics | undefined;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = "ErrorBoundary";
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
    const { onError, isFileProcessing } = this.props;
    
    this.setState({ errorInfo });
    
    // Log error
    this.logError(error, errorInfo);
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Show appropriate toast based on error type
    if (isFileProcessing) {
      toast.error('File processing error occurred', {
        description: 'Please try again or contact support if the issue persists.'
      });
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
      stack: error.stack || undefined,
      componentStack: errorInfo.componentStack || undefined,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // Error details are logged to error reporting system
      // Development debugging would use proper debugging tools
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
    } catch {
      if (process.env.NODE_ENV === 'development') {
        // Error storage handled by error reporting system
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
    const errorReport = this.getStoredErrorReports().find(
      report => report.errorId === this.state.errorId
    );
    
    if (errorReport) {
      // Create GitHub issue URL with pre-filled data
      const issueTitle = encodeURIComponent(`Error Report: ${this.state.error?.message || 'Unknown Error'}`);
      const issueBody = encodeURIComponent(`
**Error ID:** ${errorReport.errorId}
**Timestamp:** ${new Date(errorReport.timestamp).toISOString()}
**Error Message:** ${errorReport.error}
**User Agent:** ${errorReport.userAgent}
**URL:** ${errorReport.url}

**Stack Trace:**
\`\`\`
${errorReport.stack || 'No stack trace available'}
\`\`\`

**Component Stack:**
\`\`\`
${errorReport.componentStack || 'No component stack available'}
\`\`\`
      `);
      
      const githubUrl = `https://github.com/your-repo/issues/new?title=${issueTitle}&body=${issueBody}`;
      window.open(githubUrl, '_blank');
    }
  };

  // File processing specific methods
  private handleCopyError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        toast.success('Error details copied to clipboard');
      })
      .catch(() => {
        toast.error('Failed to copy error details');
      });
  };

  private handleDownloadErrorLog = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      error: {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        name: this.state.error?.name
      },
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      performanceMetrics: this.getPerformanceMetrics()
    };

    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-log-${this.state.errorId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('memory') || message.includes('heap')) {
      return 'Memory Error';
    }
    if (message.includes('worker') || message.includes('timeout')) {
      return 'Worker Error';
    }
    if (message.includes('file') || message.includes('format')) {
      return 'File Format Error';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('permission') || message.includes('access')) {
      return 'Permission Error';
    }
    
    return 'Unknown Error';
  };

  private getSuggestedActions = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('memory') || message.includes('heap')) {
      suggestions.push('Try using a smaller file');
      suggestions.push('Close other browser tabs to free up memory');
      suggestions.push('Refresh the page and try again');
    } else if (message.includes('worker') || message.includes('timeout')) {
      suggestions.push('The file might be too large or complex');
      suggestions.push('Try reducing the quality settings');
      suggestions.push('Check your internet connection');
    } else if (message.includes('file') || message.includes('format')) {
      suggestions.push('Ensure the file format is supported');
      suggestions.push('Try converting the file to a different format first');
      suggestions.push('Check if the file is corrupted');
    } else {
      suggestions.push('Refresh the page and try again');
      suggestions.push('Try using a different file');
      suggestions.push('Clear your browser cache');
    }

    suggestions.push('Contact support if the issue persists');
    return suggestions;
  };

  private getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};
    
    // Memory metrics (Chrome-specific)
    if ('memory' in performance) {
      const memoryInfo = (performance as unknown as { memory: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number; } }).memory;
      metrics.memory = {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
      };
    }
    
    // Timing metrics using modern Navigation Timing API (Level 2)
    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const navTiming = navEntries[0];
        metrics.timing = {
          navigationStart: navTiming.startTime,
          loadEventEnd: navTiming.loadEventEnd,
          domContentLoadedEventEnd: navTiming.domContentLoadedEventEnd
        };
      }
    } catch {
      // Navigation Timing API not available
    }
    
    return metrics;
  }

  private getStoredErrorReports = (): ErrorReport[] => {
    try {
      return JSON.parse(localStorage.getItem('error_reports') || '[]');
    } catch {
      return [];
    }
  };

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  render() {
    const { hasError, error, isRecovering, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, showErrorDetails = false, isFileProcessing, showDetailedError } = this.props;
    
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
      
      // File processing specific error UI
      if (isFileProcessing) {
        const errorCategory = this.getErrorCategory(error);
        const suggestedActions = this.getSuggestedActions(error);

        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl mx-auto shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <FileX className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                      File Processing Error
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="destructive" className="text-xs">
                        {errorCategory}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Error ID: {this.state.errorId}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="mt-2">
                    {error.message || 'An unexpected error occurred while processing your file.'}
                  </AlertDescription>
                </Alert>

                {showDetailedError && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Technical Details
                    </h3>
                    <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Suggested Actions
                  </h3>
                  <ul className="space-y-2">
                    {suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    onClick={this.handleManualRetry}
                    disabled={isRecovering}
                    className="flex items-center gap-2"
                  >
                    {isRecovering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={this.handleCopyError}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Error
                  </Button>

                  <Button
                    onClick={this.handleDownloadErrorLog}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Log
                  </Button>

                  <Button
                    onClick={this.handleReportError}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Report Issue
                  </Button>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={this.handleGoHome}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Go to Home
                    </Button>
                    <Button
                      onClick={this.handleReload}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reload Page
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      // Show standard error UI
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

export default ErrorBoundary;