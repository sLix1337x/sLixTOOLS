import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface StandardErrorFallbackProps {
  error: Error;
  showErrorDetails: boolean;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onReportError: () => void;
}

export function StandardErrorFallback({
  error,
  showErrorDetails,
  retryCount,
  maxRetries,
  onRetry,
  onReload,
  onGoHome,
  onReportError
}: StandardErrorFallbackProps) {
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
            <Button onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}

          <Button variant="outline" onClick={onReload} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>

          <Button variant="outline" onClick={onGoHome} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReportError}
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
