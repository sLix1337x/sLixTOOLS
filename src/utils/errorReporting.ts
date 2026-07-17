import type { ErrorInfo } from 'react';

export interface PerformanceMetrics {
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

export interface ErrorReport {
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

const ERROR_REPORTS_STORAGE_KEY = 'error_reports';
const MAX_STORED_REPORTS = 10;

export function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function buildErrorReport(errorId: string, error: Error, errorInfo: ErrorInfo): ErrorReport {
  return {
    errorId,
    timestamp: Date.now(),
    error: error.message,
    stack: error.stack || undefined,
    componentStack: errorInfo.componentStack || undefined,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
}

export function storeErrorReport(report: ErrorReport): void {
  try {
    const existingReports = JSON.parse(
      localStorage.getItem(ERROR_REPORTS_STORAGE_KEY) || '[]'
    );

    existingReports.push(report);

    const recentReports = existingReports.slice(-MAX_STORED_REPORTS);

    localStorage.setItem(ERROR_REPORTS_STORAGE_KEY, JSON.stringify(recentReports));
  } catch {
    // Storage unavailable (quota exceeded, private browsing, etc.) — non-critical, safe to skip
  }
}

export function getStoredErrorReports(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem(ERROR_REPORTS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getErrorCategory(error: Error): string {
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
}

export function getSuggestedActions(error: Error): string[] {
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
}

export function getPerformanceMetrics(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};

  if ('memory' in performance) {
    const memoryInfo = (performance as unknown as { memory: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number; } }).memory;
    metrics.memory = {
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
    };
  }

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

export function buildGithubIssueUrl(errorReport: ErrorReport): string {
  const issueTitle = encodeURIComponent(`Error Report: ${errorReport.error || 'Unknown Error'}`);
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

  return `https://github.com/your-repo/issues/new?title=${issueTitle}&body=${issueBody}`;
}
