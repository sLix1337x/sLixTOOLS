import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { AlertTriangle, RefreshCw, Home, FileX, Download, Copy, ExternalLink } from 'lucide-react';
import { getErrorCategory, getSuggestedActions } from '@/utils/errorReporting';

interface FileProcessingErrorFallbackProps {
  error: Error;
  errorId: string;
  showDetailedError: boolean;
  isRecovering: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onReportError: () => void;
  onCopyError: () => void;
  onDownloadErrorLog: () => void;
}

export function FileProcessingErrorFallback({
  error,
  errorId,
  showDetailedError,
  isRecovering,
  onRetry,
  onReload,
  onGoHome,
  onReportError,
  onCopyError,
  onDownloadErrorLog,
}: FileProcessingErrorFallbackProps) {
  const errorCategory = getErrorCategory(error);
  const suggestedActions = getSuggestedActions(error);

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
                  Error ID: {errorId}
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Suggested Actions</h3>
            <ul className="space-y-2">
              {suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={onRetry} disabled={isRecovering} className="flex items-center gap-2">
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

            <Button onClick={onCopyError} variant="outline" className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Copy Error
            </Button>

            <Button
              onClick={onDownloadErrorLog}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Log
            </Button>

            <Button onClick={onReportError} variant="outline" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Report Issue
            </Button>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={onGoHome}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
              <Button
                onClick={onReload}
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
