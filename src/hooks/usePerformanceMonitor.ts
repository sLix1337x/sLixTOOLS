import { useCallback } from 'react';
import { getPerformanceMonitor } from '@/utils/performancemonitor';

/**
 * Hook for monitoring component performance and user interactions
 */
export const usePerformanceMonitor = () => {
  const performanceMonitor = getPerformanceMonitor();

  const startTiming = useCallback((operation: string) => {
    return performanceMonitor.startComponentRender(operation);
  }, [performanceMonitor]);

  const getMetrics = useCallback((componentName?: string) => {
    return componentName ? performanceMonitor.getComponentMetrics(componentName) : performanceMonitor.getPerformanceReport();
  }, [performanceMonitor]);

  const trackPageLoad = useCallback((pageName: string) => {
    return performanceMonitor.startComponentRender(`page-load-${pageName}`);
  }, [performanceMonitor]);

  const trackFileProcessing = useCallback((operation: string, fileSize: number) => {
    const endRender = performanceMonitor.startComponentRender(`${operation}-processing`);
    
    return () => {
      endRender();
      performanceMonitor.trackMemoryUsage(`${operation}-processing`);
      
      // Log performance metrics for analysis
      if (process.env.NODE_ENV === 'development') {
        const metrics = performanceMonitor.getComponentMetrics(`${operation}-processing`);
        if (metrics) {
          console.log(`Performance: ${operation}`, {
            renderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
            fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
            throughput: `${(fileSize / 1024 / 1024 / (metrics.averageRenderTime / 1000)).toFixed(2)}MB/s`
          });
        }
      }
    };
  }, [performanceMonitor]);

  const trackChunkLoad = useCallback((chunkName: string) => {
    return performanceMonitor.startComponentRender(`chunk-load-${chunkName}`);
  }, [performanceMonitor]);

  const measureFunction = useCallback(<T>(fn: () => T, name: string): T => {
    return performanceMonitor.measureFunction(fn, name);
  }, [performanceMonitor]);

  const measureAsyncFunction = useCallback(async <T>(fn: () => Promise<T>, name: string): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(fn, name);
  }, [performanceMonitor]);

  return {
    startTiming,
    getMetrics,
    trackPageLoad,
    trackFileProcessing,
    trackChunkLoad,
    measureFunction,
    measureAsyncFunction,
    getMemoryUsage: () => performanceMonitor.getMemoryUsage(),
    clearMetrics: () => performanceMonitor.clearMetrics()
  };
};

export default usePerformanceMonitor;