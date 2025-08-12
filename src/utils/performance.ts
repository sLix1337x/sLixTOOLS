// Performance monitoring utility for tracking conversion operations

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  fileSize?: number;
  timestamp: Date;
}

// Helper function to check if we're in development mode
// Can be overridden for testing
export let isDevelopmentMode = (): boolean => {
  return import.meta.env.DEV;
};

// Function to override isDevelopmentMode for testing
export const setDevelopmentMode = (devMode: boolean): void => {
  isDevelopmentMode = () => devMode;
};

// Function to reset isDevelopmentMode to default
export const resetDevelopmentMode = (): void => {
  isDevelopmentMode = () => import.meta.env.DEV;
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers: Map<string, number> = new Map();

  start(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  end(operation: string, fileSize?: number): PerformanceMetrics | null {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      operation,
      duration,
      fileSize,
      timestamp: new Date(),
    };

    this.metrics.push(metric);
    this.timers.delete(operation);

    // Log to console in development
    if (isDevelopmentMode()) {
      console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`, 
        fileSize ? `(${(fileSize / 1024 / 1024).toFixed(2)}MB)` : '');
    }

    // Send to analytics if available
    this.sendToAnalytics(metric);

    return metric;
  }

  private sendToAnalytics(metric: PerformanceMetrics): void {
    // Implement analytics integration here
    if (typeof window !== 'undefined' && 'gtag' in window && typeof window.gtag === 'function') {
      window.gtag('event', 'timing_complete', {
        event_category: 'Performance',
        event_label: metric.operation,
        value: Math.round(metric.duration),
      });
    }
  }

  recordMetric(operation: string, duration: number, fileSize?: number): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      fileSize,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Log to console in development
    if (isDevelopmentMode()) {
      console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`, 
        fileSize ? `(${(fileSize / 1024 / 1024).toFixed(2)}MB)` : '');
    }

    // Send to analytics if available
    this.sendToAnalytics(metric);
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for easy usage
import { useCallback } from 'react';

export const usePerformanceMonitor = () => {
  const startMonitoring = useCallback((operation: string) => {
    performanceMonitor.start(operation);
  }, []);

  const endMonitoring = useCallback((operation: string, fileSize?: number) => {
    return performanceMonitor.end(operation, fileSize);
  }, []);

  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  return {
    startMonitoring,
    endMonitoring,
    getMetrics,
  };
};

