/**
 * Simplified Error Logging Utility
 * Essential error logging with basic context
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

// Simplified error information interface
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string | undefined;
  context: {
    component?: string | undefined;
    action?: string | undefined;
    fileInfo?: {
      name: string;
      size: number;
      type: string;
    } | undefined;
    userAgent: string;
    url: string;
  };
  metadata?: import('@/types/common').ErrorMetadata | undefined;
}

// Simplified error logger class
class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 50; // Keep last 50 errors
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          message: event.message || 'Unknown error',
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          stack: event.error?.stack,
          context: {
            component: 'Global',
            action: 'Runtime Error',
            userAgent: navigator.userAgent,
            url: window.location.href,
          }
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          context: {
            component: 'Global',
            action: 'Promise Rejection',
            userAgent: navigator.userAgent,
            url: window.location.href,
          }
        });
      });
    }
  }

  private categorizeError(error: Error | string): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message;
    
    if (message.includes('file') || message.includes('upload')) {
      return ErrorCategory.FILE_PROCESSING;
    }
    if (message.includes('memory') || message.includes('heap')) {
      return ErrorCategory.MEMORY;
    }
    if (message.includes('worker')) {
      return ErrorCategory.WORKER;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  private getSeverity(category: ErrorCategory): ErrorSeverity {
    if (category === ErrorCategory.MEMORY || category === ErrorCategory.WORKER) {
      return ErrorSeverity.HIGH;
    }
    if (category === ErrorCategory.FILE_PROCESSING || category === ErrorCategory.VALIDATION) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  logError(errorInfo: Partial<ErrorLogEntry> & { 
    message: string; 
    context: Partial<ErrorLogEntry['context']> & { component?: string | undefined; action?: string | undefined; };
  }): string {
    const error = typeof errorInfo.message === 'string' ? new Error(errorInfo.message) : errorInfo.message;
    const category = errorInfo.category || this.categorizeError(error);
    const severity = errorInfo.severity || this.getSeverity(category);

    const logEntry: ErrorLogEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category,
      severity,
      message: errorInfo.message,
      stack: errorInfo.stack || (error instanceof Error ? error.stack : undefined),
      context: {
        component: errorInfo.context?.component || 'Unknown',
        action: errorInfo.context?.action || 'Unknown',
        fileInfo: errorInfo.context?.fileInfo,
        ...(errorInfo.context || {}),
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      metadata: errorInfo.metadata
    };

    // Add to logs array
    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Show user notification for high/critical errors
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      this.showUserNotification(logEntry);
    }

    // Console logging for development
    // In development, errors are logged to console via toast notifications
      // Production logging would be handled by external service

    return logEntry.id;
  }

  private showUserNotification(logEntry: ErrorLogEntry): void {
    const message = logEntry.severity === ErrorSeverity.CRITICAL 
      ? `Critical error: ${logEntry.message}`
      : `Error: ${logEntry.message}`;
    
    toast.error(message, {
      duration: 5000,
      action: {
        label: 'Details',
        onClick: () => this.showErrorDetails(logEntry.id)
      }
    });
  }

  private showErrorDetails(errorId: string): void {
    const error = this.getLogById(errorId);
    if (error) {
      console.group(`Error Details: ${error.id}`);
      // Error details are available in the error object
    // Development debugging would use proper debugging tools
      console.groupEnd();
    }
  }

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
    toast.success('Error logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      logs: this.logs
    }, null, 2);
  }

  // Convenience methods for common error types
  logFileProcessingError(
    error: Error | string, 
    file: File | { name: string; size: number; type: string }, 
    description: string,
    action: string = 'file_processing',
    metadata?: import('@/types/common').ErrorMetadata
  ): string {
    return this.logError({
      message: typeof error === 'string' ? error : error.message,
      category: ErrorCategory.FILE_PROCESSING,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        component: 'FileProcessor',
        action,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      metadata: {
        description,
        ...metadata
      }
    });
  }

  logMemoryError(error: Error | string, component: string): string {
    return this.logError({
      message: typeof error === 'string' ? error : error.message,
      category: ErrorCategory.MEMORY,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        component,
        action: 'memory_operation',
        userAgent: navigator.userAgent,
        url: window.location.href,
      }
    });
  }

  logWorkerError(error: Error | string, component: string, workerType: string): string {
    return this.logError({
      message: typeof error === 'string' ? error : error.message,
      category: ErrorCategory.WORKER,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        component,
        action: 'worker_operation',
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      metadata: {
        workerType
      }
    });
  }
}

// Export singleton instance
const errorLogger = new ErrorLogger();

export default errorLogger;
export { ErrorLogger };

// Global error logger for debugging
declare global {
  interface Window {
    errorLogger: ErrorLogger;
  }
}

if (typeof window !== 'undefined') {
  window.errorLogger = errorLogger;
}