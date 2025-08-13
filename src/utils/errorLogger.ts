/**
 * Comprehensive Error Logging Utility
 * Captures failures with reproduction steps and detailed context
 */

import { toast } from 'sonner';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  FILE_PROCESSING = 'file_processing',
  MEMORY = 'memory',
  WORKER = 'worker',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

// Detailed error information interface
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: {
    component?: string;
    action?: string;
    fileInfo?: {
      name: string;
      size: number;
      type: string;
    };
    userAgent: string;
    url: string;
    viewport: {
      width: number;
      height: number;
    };
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
  };
  reproductionSteps: string[];
  fallbackSuggestions: string[];
  metadata?: Record<string, any>;
}

// Error logger class
class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100; // Keep last 100 errors
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.message,
        stack: event.error?.stack,
        context: {
          component: 'Global',
          action: 'Unhandled Error',
          userAgent: navigator.userAgent,
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        reproductionSteps: [
          'An unhandled JavaScript error occurred',
          `Error in file: ${event.filename}:${event.lineno}:${event.colno}`,
          'Check browser console for more details'
        ],
        fallbackSuggestions: [
          'Refresh the page and try again',
          'Clear browser cache and cookies',
          'Try using a different browser',
          'Contact support if the issue persists'
        ]
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        context: {
          component: 'Global',
          action: 'Unhandled Promise Rejection',
          userAgent: navigator.userAgent,
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        reproductionSteps: [
          'An unhandled promise rejection occurred',
          'This usually indicates an async operation failed',
          'Check network connectivity and try again'
        ],
        fallbackSuggestions: [
          'Check your internet connection',
          'Refresh the page and try again',
          'Try the operation again in a few moments',
          'Contact support if the issue persists'
        ]
      });
    });
  }

  private getMemoryInfo(): { used: number; total: number; limit: number } | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return undefined;
  }

  private categorizeError(error: Error | string): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('memory') || lowerMessage.includes('heap')) {
      return ErrorCategory.MEMORY;
    }
    if (lowerMessage.includes('worker') || lowerMessage.includes('timeout')) {
      return ErrorCategory.WORKER;
    }
    if (lowerMessage.includes('file') || lowerMessage.includes('format') || lowerMessage.includes('processing')) {
      return ErrorCategory.FILE_PROCESSING;
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (lowerMessage.includes('render') || lowerMessage.includes('component')) {
      return ErrorCategory.UI;
    }

    return ErrorCategory.UNKNOWN;
  }

  private getSeverity(category: ErrorCategory, error: Error | string): ErrorSeverity {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    // Critical errors that break core functionality
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for memory and worker issues
    if (category === ErrorCategory.MEMORY || category === ErrorCategory.WORKER) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for file processing and network issues
    if (category === ErrorCategory.FILE_PROCESSING || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity for validation and UI issues
    return ErrorSeverity.LOW;
  }

  private generateFallbackSuggestions(category: ErrorCategory): string[] {
    const baseSuggestions = [
      'Refresh the page and try again',
      'Contact support if the issue persists'
    ];

    switch (category) {
      case ErrorCategory.MEMORY:
        return [
          'Try using a smaller file',
          'Close other browser tabs to free up memory',
          'Restart your browser',
          ...baseSuggestions
        ];
      
      case ErrorCategory.WORKER:
        return [
          'The file might be too large or complex',
          'Try reducing quality settings',
          'Wait a moment and try again',
          ...baseSuggestions
        ];
      
      case ErrorCategory.FILE_PROCESSING:
        return [
          'Ensure the file format is supported',
          'Try a different file',
          'Check if the file is corrupted',
          'Try converting to a different format first',
          ...baseSuggestions
        ];
      
      case ErrorCategory.NETWORK:
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Disable VPN if you\'re using one',
          ...baseSuggestions
        ];
      
      case ErrorCategory.VALIDATION:
        return [
          'Check the file format and size',
          'Ensure all required fields are filled',
          'Try with a different file',
          ...baseSuggestions
        ];
      
      default:
        return baseSuggestions;
    }
  }

  // Main logging method
  logError(errorInfo: Partial<ErrorLogEntry> & { 
    message: string; 
    context: Partial<ErrorLogEntry['context']> & { component?: string; action?: string; };
  }): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const category = errorInfo.category || this.categorizeError(errorInfo.message);
    const severity = errorInfo.severity || this.getSeverity(category, errorInfo.message);
    
    const logEntry: ErrorLogEntry = {
      id: errorId,
      timestamp: new Date().toISOString(),
      category,
      severity,
      message: errorInfo.message,
      stack: errorInfo.stack,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: this.getMemoryInfo(),
        ...errorInfo.context
      },
      reproductionSteps: errorInfo.reproductionSteps || [
        'Error occurred during normal operation',
        'Check the error details for more information'
      ],
      fallbackSuggestions: errorInfo.fallbackSuggestions || this.generateFallbackSuggestions(category),
      metadata: {
        sessionId: this.sessionId,
        ...errorInfo.metadata
      }
    };

    // Add to logs array
    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Logged [${severity.toUpperCase()}] - ${category}`);
      console.error('Message:', errorInfo.message);
      console.log('Error ID:', errorId);
      console.log('Context:', logEntry.context);
      console.log('Reproduction Steps:', logEntry.reproductionSteps);
      console.log('Fallback Suggestions:', logEntry.fallbackSuggestions);
      if (errorInfo.stack) {
        console.log('Stack Trace:', errorInfo.stack);
      }
      console.groupEnd();
    }

    // Show user-friendly toast notification
    this.showUserNotification(logEntry);

    // Store in localStorage for persistence
    this.persistLogs();

    return errorId;
  }

  private showUserNotification(logEntry: ErrorLogEntry): void {
    const isHighSeverity = [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(logEntry.severity);
    
    if (isHighSeverity) {
      toast.error(`${logEntry.category.replace('_', ' ').toUpperCase()} Error`, {
        description: logEntry.message,
        action: {
          label: 'View Details',
          onClick: () => this.showErrorDetails(logEntry.id)
        },
        duration: 10000
      });
    } else {
      toast.warning('Processing Issue', {
        description: 'A minor issue occurred. The operation may still succeed.',
        duration: 5000
      });
    }
  }

  private showErrorDetails(errorId: string): void {
    const error = this.logs.find(log => log.id === errorId);
    if (error) {
      console.group(`Error Details - ${errorId}`);
      console.log(error);
      console.groupEnd();
      
      // Copy error details to clipboard
      navigator.clipboard.writeText(JSON.stringify(error, null, 2))
        .then(() => {
          toast.success('Error details copied to clipboard');
        })
        .catch(() => {
          toast.error('Failed to copy error details');
        });
    }
  }

  private persistLogs(): void {
    try {
      const logsToStore = this.logs.slice(0, 20); // Store only last 20 logs
      localStorage.setItem('errorLogs', JSON.stringify(logsToStore));
    } catch (error) {
      console.warn('Failed to persist error logs:', error);
    }
  }

  // Public methods for retrieving logs
  getLogs(category?: ErrorCategory, severity?: ErrorSeverity): ErrorLogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }
    
    return filteredLogs;
  }

  getLogById(id: string): ErrorLogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('errorLogs');
    toast.success('Error logs cleared');
  }

  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      exportTimestamp: new Date().toISOString(),
      logs: this.logs,
      summary: {
        totalErrors: this.logs.length,
        byCategory: this.getLogsSummary().byCategory,
        bySeverity: this.getLogsSummary().bySeverity
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  downloadLogs(): void {
    const logsData = this.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${this.sessionId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Error logs downloaded');
  }

  getLogsSummary(): {
    totalErrors: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const byCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = this.logs.filter(log => log.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.logs.filter(log => log.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: this.logs.length,
      byCategory,
      bySeverity
    };
  }

  // Convenience methods for specific error types
  logFileProcessingError(error: Error | string, fileInfo: { name: string; size: number; type: string }, component: string, action: string): string {
    return this.logError({
      category: ErrorCategory.FILE_PROCESSING,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: {
        component,
        action,
        fileInfo
      },
      reproductionSteps: [
        `1. Navigate to ${component}`,
        `2. Upload file: ${fileInfo.name} (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB)`,
        `3. Attempt action: ${action}`,
        '4. Error occurred during processing'
      ]
    });
  }

  logMemoryError(error: Error | string, component: string, memoryUsage?: { used: number; total: number }): string {
    return this.logError({
      category: ErrorCategory.MEMORY,
      severity: ErrorSeverity.HIGH,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: {
        component,
        action: 'Memory allocation/usage',
        memory: memoryUsage ? { ...memoryUsage, limit: 0 } : undefined
      },
      reproductionSteps: [
        '1. Perform memory-intensive operation',
        '2. Memory limit exceeded or allocation failed',
        '3. Browser may become unresponsive'
      ]
    });
  }

  logWorkerError(error: Error | string, component: string, workerType: string): string {
    return this.logError({
      category: ErrorCategory.WORKER,
      severity: ErrorSeverity.HIGH,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: {
        component,
        action: `${workerType} worker operation`
      },
      reproductionSteps: [
        `1. Start ${workerType} worker`,
        '2. Send data to worker for processing',
        '3. Worker failed or timed out',
        '4. Error occurred in worker thread'
      ]
    });
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

// Export singleton and types
export default errorLogger;
export { ErrorLogger };

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).errorLogger = errorLogger;
}