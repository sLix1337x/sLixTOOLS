/**
 * Comprehensive performance optimization hook
 * Integrates all performance utilities and provides a unified interface
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPerformanceMonitor } from '@/utils/performanceMonitor.tsx';
import { MemoryManager } from '@/utils/memoryManager';
import { useAdvancedCache } from '@/utils/advancedCaching';
import { useWorkerManager } from '@/utils/workerManager';
import { PERFORMANCE_CONFIG } from '@/config/performance';

interface PerformanceState {
  isOptimized: boolean;
  memoryUsage: number;
  renderTime: number;
  cacheHitRate: number;
  networkLatency: number;
  bundleLoadTime: number;
  recommendations: string[];
  score: number;
}

interface OptimizationOptions {
  enableMemoryOptimization?: boolean;
  enableCacheOptimization?: boolean;
  enableWorkerOptimization?: boolean;
  enableImageOptimization?: boolean;
  enableNetworkOptimization?: boolean;
  monitoringInterval?: number;
}

interface PerformanceMetrics {
  componentRenderTime: number;
  memoryLeaks: number;
  cacheEfficiency: number;
  networkRequests: number;
  bundleSize: number;
  criticalResourcesLoaded: boolean;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  enableMemoryOptimization: true,
  enableCacheOptimization: true,
  enableWorkerOptimization: true,
  enableImageOptimization: true,
  enableNetworkOptimization: true,
  monitoringInterval: 5000,
};

export const usePerformanceOptimization = (
  componentName: string,
  options: OptimizationOptions = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<PerformanceState>({
    isOptimized: false,
    memoryUsage: 0,
    renderTime: 0,
    cacheHitRate: 0,
    networkLatency: 0,
    bundleLoadTime: 0,
    recommendations: [],
    score: 0,
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    componentRenderTime: 0,
    memoryLeaks: 0,
    cacheEfficiency: 0,
    networkRequests: 0,
    bundleSize: 0,
    criticalResourcesLoaded: false,
  });

  const performanceMonitor = useRef(getPerformanceMonitor());
  const memoryManager = useRef(MemoryManager.getInstance());
  const workerManager = useWorkerManager();
  const imageCache = useAdvancedCache('images');
  const apiCache = useAdvancedCache('api');
  const processedCache = useAdvancedCache('processed');
  
  const renderStartTime = useRef<number>(0);
  const componentMountTime = useRef<number>(Date.now());
  const networkRequests = useRef<Set<string>>(new Set());
  const optimizationApplied = useRef<boolean>(false);

  // Performance monitoring
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Track memory usage for this component
      performanceMonitor.current.trackMemoryUsage(componentName);
      
      setMetrics(prev => ({
        ...prev,
        componentRenderTime: renderTime,
      }));
      
      renderStartTime.current = 0;
    }
  }, [componentName]);

  // Memory optimization
  const optimizeMemory = useCallback(async () => {
    if (!opts.enableMemoryOptimization) return;

    try {
      const memoryUsage = memoryManager.current.getMemoryUsage();
      const leaks = await memoryManager.current.detectMemoryLeaks();
      
      if (memoryUsage > PERFORMANCE_CONFIG.memoryManagement.maxHeapSize) {
        await memoryManager.current.cleanup();
      }
      
      setMetrics(prev => ({
        ...prev,
        memoryLeaks: leaks.length,
      }));
      
      setState(prev => ({
        ...prev,
        memoryUsage,
      }));
    } catch (error) {
      console.warn('Memory optimization failed:', error);
    }
  }, [opts.enableMemoryOptimization]);

  // Cache optimization
  const optimizeCache = useCallback(async () => {
    if (!opts.enableCacheOptimization) return;

    try {
      const imageStats = await imageCache.getStats();
      const apiStats = await apiCache.getStats();
      const processedStats = await processedCache.getStats();
      
      const totalHits = imageStats.hits + apiStats.hits + processedStats.hits;
      const totalRequests = totalHits + imageStats.misses + apiStats.misses + processedStats.misses;
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      
      setMetrics(prev => ({
        ...prev,
        cacheEfficiency: hitRate,
      }));
      
      setState(prev => ({
        ...prev,
        cacheHitRate: hitRate,
      }));
    } catch (error) {
      console.warn('Cache optimization failed:', error);
    }
  }, [opts.enableCacheOptimization, imageCache, apiCache, processedCache]);

  // Network optimization
  const optimizeNetwork = useCallback(async () => {
    if (!opts.enableNetworkOptimization) return;

    try {
      // Measure network latency
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD' });
      const latency = performance.now() - start;
      
      setState(prev => ({
        ...prev,
        networkLatency: latency,
      }));
      
      setMetrics(prev => ({
        ...prev,
        networkRequests: networkRequests.current.size,
      }));
    } catch (error) {
      console.warn('Network optimization failed:', error);
    }
  }, [opts.enableNetworkOptimization]);

  // Bundle optimization
  const optimizeBundle = useCallback(async () => {
    try {
      // Measure bundle load time
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
        const loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
        
        setState(prev => ({
          ...prev,
          bundleLoadTime: loadTime,
        }));
      }
      
      // Estimate bundle size
      const resources = performance.getEntriesByType('resource');
      const bundleSize = resources.reduce((total, resource) => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          return total + ((resource as PerformanceResourceTiming & { transferSize?: number }).transferSize || 0);
        }
        return total;
      }, 0);
      
      setMetrics(prev => ({
        ...prev,
        bundleSize,
      }));
    } catch (error) {
      console.warn('Bundle optimization failed:', error);
    }
  }, []);

  // Worker optimization
  const optimizeWithWorkers = useCallback(async (task: string, data: unknown) => {
    if (!opts.enableWorkerOptimization) {
      return data; // Fallback to main thread
    }

    try {
      return await workerManager.executeTask(task, data);
    } catch (error) {
      console.warn('Worker optimization failed, falling back to main thread:', error);
      return data;
    }
  }, [opts.enableWorkerOptimization, workerManager]);

  // Image optimization
  interface ImageOptimizationOptions {
    quality?: number;
    format?: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  }

  const optimizeImage = useCallback(async (imageUrl: string, options?: ImageOptimizationOptions) => {
    if (!opts.enableImageOptimization) return imageUrl;

    try {
      // Check cache first
      const cacheKey = `${imageUrl}-${JSON.stringify(options || {})}`;
      const cached = await imageCache.get(cacheKey);
      
      if (cached) {
        return URL.createObjectURL(cached);
      }
      
      // Use worker for image processing if available
      const optimizedBlob = await optimizeWithWorkers('optimizeImage', {
        url: imageUrl,
        options,
      });
      
      // Cache the result
      await imageCache.set(cacheKey, optimizedBlob);
      
      return URL.createObjectURL(optimizedBlob);
    } catch (error) {
      console.warn('Image optimization failed:', error);
      return imageUrl;
    }
  }, [opts.enableImageOptimization, imageCache, optimizeWithWorkers]);

  // Generate performance recommendations
  const generateRecommendations = useCallback((currentMetrics: PerformanceMetrics, currentState: PerformanceState) => {
    const recommendations: string[] = [];
    
    if (currentMetrics.componentRenderTime > 16) {
      recommendations.push('Consider using React.memo or useMemo to optimize render performance');
    }
    
    if (currentState.memoryUsage > 50) {
      recommendations.push('High memory usage detected. Implement cleanup in useEffect');
    }
    
    if (currentState.cacheHitRate < 0.8) {
      recommendations.push('Low cache hit rate. Review caching strategies');
    }
    
    if (currentState.networkLatency > 200) {
      recommendations.push('High network latency. Consider using a CDN or optimizing API calls');
    }
    
    if (currentMetrics.bundleSize > 1024 * 1024) { // 1MB
      recommendations.push('Large bundle size. Implement code splitting and lazy loading');
    }
    
    if (currentMetrics.memoryLeaks > 0) {
      recommendations.push(`${currentMetrics.memoryLeaks} potential memory leaks detected`);
    }
    
    if (currentState.bundleLoadTime > 3000) {
      recommendations.push('Slow bundle load time. Optimize critical resource loading');
    }
    
    return recommendations;
  }, []);

  // Calculate performance score
  const calculateScore = useCallback((currentMetrics: PerformanceMetrics, currentState: PerformanceState) => {
    let score = 100;
    
    // Penalize based on metrics
    if (currentMetrics.componentRenderTime > 16) score -= 15;
    if (currentState.memoryUsage > 50) score -= 20;
    if (currentState.cacheHitRate < 0.8) score -= 10;
    if (currentState.networkLatency > 200) score -= 10;
    if (currentMetrics.bundleSize > 1024 * 1024) score -= 15;
    if (currentMetrics.memoryLeaks > 0) score -= 20;
    if (currentState.bundleLoadTime > 3000) score -= 10;
    
    return Math.max(0, score);
  }, []);

  // Comprehensive optimization
  const runOptimization = useCallback(async () => {
    if (optimizationApplied.current) return;
    
    try {
      await Promise.all([
        optimizeMemory(),
        optimizeCache(),
        optimizeNetwork(),
        optimizeBundle(),
      ]);
      
      optimizationApplied.current = true;
      
      setState(prev => {
        const recommendations = generateRecommendations(metrics, prev);
        const score = calculateScore(metrics, prev);
        
        return {
          ...prev,
          isOptimized: true,
          recommendations,
          score,
        };
      });
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  }, [optimizeMemory, optimizeCache, optimizeNetwork, optimizeBundle, generateRecommendations, calculateScore, metrics]);

  // Monitor network requests
  const trackNetworkRequest = useCallback((url: string) => {
    networkRequests.current.add(url);
  }, []);

  // Preload critical resources
  const preloadCriticalResources = useCallback(async (resources: string[]) => {
    try {
      const preloadPromises = resources.map(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        
        if (resource.endsWith('.js')) {
          link.as = 'script';
        } else if (resource.endsWith('.css')) {
          link.as = 'style';
        } else if (resource.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
          link.as = 'image';
        }
        
        document.head.appendChild(link);
        
        return new Promise((resolve, reject) => {
          link.onload = resolve;
          link.onerror = reject;
        });
      });
      
      await Promise.all(preloadPromises);
      
      setMetrics(prev => ({
        ...prev,
        criticalResourcesLoaded: true,
      }));
    } catch (error) {
      console.warn('Failed to preload critical resources:', error);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    memoryManager.current.destroy();
    workerManager.terminateAllWorkers();
    
    // Clear network request tracking
    networkRequests.current.clear();
    
    // Reset optimization flag
    optimizationApplied.current = false;
  }, [workerManager]);

  // Auto-optimization on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runOptimization();
    }, 1000); // Delay to allow component to stabilize
    
    return () => clearTimeout(timer);
  }, [runOptimization]);

  // Periodic monitoring
  useEffect(() => {
    if (!opts.monitoringInterval) return;
    
    const interval = setInterval(() => {
      optimizeMemory();
      optimizeCache();
      optimizeNetwork();
    }, opts.monitoringInterval);
    
    return () => clearInterval(interval);
  }, [opts.monitoringInterval, optimizeMemory, optimizeCache, optimizeNetwork]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Performance measurement hooks are called directly by components when needed

  return {
    // State
    ...state,
    metrics,
    
    // Actions
    runOptimization,
    optimizeImage,
    optimizeWithWorkers,
    trackNetworkRequest,
    preloadCriticalResources,
    cleanup,
    
    // Measurement helpers
    startRenderMeasurement,
    endRenderMeasurement,
    
    // Cache utilities
    imageCache: {
      get: imageCache.get,
      set: imageCache.set,
      clear: imageCache.clear,
      getStats: imageCache.getStats,
    },
    
    // Worker utilities
    worker: {
      execute: workerManager.executeTask,
      getStats: workerManager.getStats,
    },
    
    // Memory utilities
    memory: {
      getUsage: () => memoryManager.current.getMemoryUsage(),
      cleanup: () => memoryManager.current.cleanup(),
      detectLeaks: () => memoryManager.current.detectMemoryLeaks(),
    },
  };
};

// Utility hook for component-specific optimizations
export const useComponentOptimization = (componentName: string) => {
  return usePerformanceOptimization(componentName, {
    enableMemoryOptimization: true,
    enableCacheOptimization: false, // Usually not needed for individual components
    enableWorkerOptimization: false, // Usually not needed for individual components
    enableImageOptimization: false, // Usually handled at app level
    enableNetworkOptimization: false, // Usually handled at app level
    monitoringInterval: 10000, // Less frequent monitoring for components
  });
};

// Utility hook for page-level optimizations
export const usePageOptimization = (pageName: string) => {
  return usePerformanceOptimization(pageName, {
    enableMemoryOptimization: true,
    enableCacheOptimization: true,
    enableWorkerOptimization: true,
    enableImageOptimization: true,
    enableNetworkOptimization: true,
    monitoringInterval: 5000,
  });
};

export default usePerformanceOptimization;