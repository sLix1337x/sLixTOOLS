/**
 * Enhanced Error Boundary for File Processing Operations
 * Provides detailed error information and fallback UI for file conversion tools
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  FileX, 
  Download, 
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetailedError?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class FileProcessingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error details
    console.error('File Processing Error Boundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show error toast
    toast.error('File processing error occurred', {
      description: 'Please try again or contact support if the issue persists.'
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleCopyError = () => {
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

  handleDownloadErrorLog = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      reproductionSteps: [
        '1. Navigate to the file conversion tool',
        '2. Upload or select a file',
        '3. Attempt to process the file',
        '4. Error occurred during processing'
      ]
    };

    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${this.state.errorId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Error log downloaded');
  };

  getErrorCategory = (error: Error): string => {
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

  getSuggestedActions = (error: Error): string[] => {
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

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const errorCategory = error ? this.getErrorCategory(error) : 'Unknown Error';
      const suggestions = error ? this.getSuggestedActions(error) : [];

      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-800">File Processing Error</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="destructive">{errorCategory}</Badge>
                    <Badge variant="outline" className="text-xs">
                      ID: {this.state.errorId}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Message */}
              <Alert variant="destructive">
                <FileX className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {error?.message || 'An unexpected error occurred during file processing.'}
                </AlertDescription>
              </Alert>

              {/* Suggested Actions */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-800">Suggested Actions:</h4>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleCopyError}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Error Details
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleDownloadErrorLog}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Error Log
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://github.com/your-repo/issues', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Report Issue
                </Button>
              </div>

              {/* Detailed Error (Development Only) */}
              {this.props.showDetailedError && process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs font-mono overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error?.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FileProcessingErrorBoundary;

// Higher-order component for easy wrapping
export const withFileProcessingErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WithErrorBoundary = (props: P) => (
    <FileProcessingErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </FileProcessingErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withFileProcessingErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
};