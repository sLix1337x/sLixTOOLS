import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateErrorId,
  buildErrorReport,
  storeErrorReport,
  getStoredErrorReports,
  getPerformanceMetrics,
  buildGithubIssueUrl,
} from '@/utils/errorReporting';
import { StandardErrorFallback } from './StandardErrorFallback';
import { FileProcessingErrorFallback } from './FileProcessingErrorFallback';

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

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 10000;

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary';
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, isFileProcessing } = this.props;

    this.setState({ errorInfo });

    this.logError(error, errorInfo);

    if (onError) {
      onError(error, errorInfo);
    }

    if (isFileProcessing) {
      toast.error('File processing error occurred', {
        description: 'Please try again or contact support if the issue persists.',
      });
    }

    if (this.props.enableRecovery && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const report = buildErrorReport(this.state.errorId, error, errorInfo);
    storeErrorReport(report);
  }

  private scheduleRetry() {
    const delay = Math.min(
      RETRY_BASE_DELAY_MS * Math.pow(2, this.state.retryCount),
      RETRY_MAX_DELAY_MS
    );

    this.setState({ isRecovering: true });

    const timeout = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false,
      }));
    }, delay);

    this.retryTimeouts.push(timeout);
  }

  private handleManualRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const errorReport = getStoredErrorReports().find(
      (report) => report.errorId === this.state.errorId
    );

    if (errorReport) {
      window.open(buildGithubIssueUrl(errorReport), '_blank');
    }
  };

  private handleCopyError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    navigator.clipboard
      .writeText(JSON.stringify(errorDetails, null, 2))
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
        name: this.state.error?.name,
      },
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      performanceMetrics: getPerformanceMetrics(),
    };

    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], {
      type: 'application/json',
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

  render() {
    const { hasError, error, isRecovering, retryCount, errorId } = this.state;
    const {
      children,
      fallback,
      maxRetries = 3,
      showErrorDetails = false,
      isFileProcessing,
      showDetailedError,
    } = this.props;

    if (!hasError || !error) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

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

    if (isFileProcessing) {
      return (
        <FileProcessingErrorFallback
          error={error}
          errorId={errorId}
          showDetailedError={!!showDetailedError}
          isRecovering={isRecovering}
          onRetry={this.handleManualRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onReportError={this.handleReportError}
          onCopyError={this.handleCopyError}
          onDownloadErrorLog={this.handleDownloadErrorLog}
        />
      );
    }

    return (
      <StandardErrorFallback
        error={error}
        showErrorDetails={showErrorDetails}
        retryCount={retryCount}
        maxRetries={maxRetries}
        onRetry={this.handleManualRetry}
        onReload={this.handleReload}
        onGoHome={this.handleGoHome}
        onReportError={this.handleReportError}
      />
    );
  }
}

export default ErrorBoundary;
