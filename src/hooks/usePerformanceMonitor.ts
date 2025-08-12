import { useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/utils/performance';

/**
 * Hook for monitoring component performance and user interactions
 */
export const usePerformanceMonitor = () => {
  const startTiming = useCallback((operation: string) => {
    performanceMonitor.start(operation);
  }, []);

  const endTiming = useCallback((operation: string, fileSize?: number) => {
    return performanceMonitor.end(operation, fileSize);
  }, []);

  const getMetrics = useCallback((operation?: string) => {
    return operation ? performanceMonitor.getMetrics(operation) : performanceMonitor.getMetrics();
  }, []);

  const trackPageLoad = useCallback((pageName: string) => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordMetric(`page-load-${pageName}`, loadTime);
    };
  }, []);

  const trackFileProcessing = useCallback((operation: string, fileSize: number) => {
    const startTime = performance.now();
    
    return () => {
      const processingTime = performance.now() - startTime;
      performanceMonitor.recordMetric(`${operation}-processing`, processingTime, fileSize);
      
      // Log performance metrics for analysis
      if (process.env.NODE_ENV === 'development') {
          console.log(`Performance: ${operation}`, {
            processingTime: `${processingTime.toFixed(2)}ms`,
            fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
            throughput: `${(fileSize / 1024 / 1024 / (processingTime / 1000)).toFixed(2)}MB/s`
          });
        }
    };
  }, []);

  const trackChunkLoad = useCallback((chunkName: string) => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordMetric(`chunk-load-${chunkName}`, loadTime);
      
      if (process.env.NODE_ENV === 'development') {
          console.log(`Chunk loaded: ${chunkName} in ${loadTime.toFixed(2)}ms`);
        }
    };
  }, []);

  // Track Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track Largest Contentful Paint (LCP)
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        performanceMonitor.recordMetric('lcp', lastEntry.startTime);
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            const fid = entry.processingStart - entry.startTime;
            performanceMonitor.recordMetric('fid', fid);
          }
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }

      return () => {
        observer.disconnect();
        fidObserver.disconnect();
      };
    }
  }, []);

  return {
    startTiming,
    endTiming,
    getMetrics,
    trackPageLoad,
    trackFileProcessing,
    trackChunkLoad
  };
};

export default usePerformanceMonitor;