/**
 * Simplified performance optimization hook
 * Basic performance monitoring and optimization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getPerformanceMonitor } from '@/utils/performancemonitor';
import { useMemoryManager } from '@/utils/memoryManager';
import { useAdvancedCache } from '@/utils/advancedCaching';
import { useWorkerManager } from '@/utils/workerManager';

interface PerformanceState {
  memoryUsage: number;
  renderTime: number;
  cacheHitRate: number;
  isOptimized: boolean;
}

interface OptimizationOptions {
  enableMemoryOptimization?: boolean;
  enableCacheOptimization?: boolean;
  enableWorkerOptimization?: boolean;
  monitoringInterval?: number;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  enableMemoryOptimization: true,
  enableCacheOptimization: true,
  enableWorkerOptimization: true,
  monitoringInterval: 5000,
};

export const usePerformanceOptimization = (
  componentName: string,
  options: OptimizationOptions = {}
) => {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const [state, setState] = useState<PerformanceState>({
    memoryUsage: 0,
    renderTime: 0,
    cacheHitRate: 0,
    isOptimized: false,
  });

  const performanceMonitor = useRef(getPerformanceMonitor());
  const memoryManager = useMemoryManager();
  const workerManager = useWorkerManager();
  const cache = useAdvancedCache('default');
  
  const renderStartTime = useRef<number>(0);

  // Performance monitoring
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      
      setState(prev => ({
        ...prev,
        renderTime,
      }));
      
      renderStartTime.current = 0;
    }
  }, []);

  // Memory optimization
  const optimizeMemory = useCallback(async () => {
    if (!opts.enableMemoryOptimization) return;

    try {
      const memoryUsage = memoryManager.getMemoryUsage();
      
      setState(prev => ({
        ...prev,
        memoryUsage,
      }));
    } catch (error) {
      console.warn('Memory optimization failed:', error);
    }
  }, [opts.enableMemoryOptimization, memoryManager]);

  // Cache optimization
  const optimizeCache = useCallback(async () => {
    if (!opts.enableCacheOptimization) return;

    try {
      const stats = await cache.getStats();
      const hitRate = stats.hits + stats.misses > 0 
        ? stats.hits / (stats.hits + stats.misses) 
        : 0;
      
      setState(prev => ({
        ...prev,
        cacheHitRate: hitRate,
      }));
    } catch (error) {
      console.warn('Cache optimization failed:', error);
    }
  }, [opts.enableCacheOptimization, cache]);

  // Run optimizations
  const runOptimizations = useCallback(async () => {
    await Promise.all([
      optimizeMemory(),
      optimizeCache(),
    ]);
    
    setState(prev => ({
      ...prev,
      isOptimized: true,
    }));
  }, [optimizeMemory, optimizeCache]);

  // Periodic optimization
  useEffect(() => {
    const interval = setInterval(() => {
      runOptimizations();
    }, opts.monitoringInterval);
    
    // Initial optimization
    runOptimizations();
    
    return () => clearInterval(interval);
  }, [opts.monitoringInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      memoryManager.cleanup();
    };
  }, [memoryManager]);

  return {
    // State
    ...state,
    
    // Methods
    startRenderMeasurement,
    endRenderMeasurement,
    optimizeMemory,
    optimizeCache,
    runOptimizations,
    
    // Utilities
    performanceMonitor: performanceMonitor.current,
    memoryManager,
    workerManager,
    cache,
    
    // Stats
    getStats: () => ({
      memory: state.memoryUsage,
      renderTime: state.renderTime,
      cacheHitRate: state.cacheHitRate,
      workerStats: workerManager.getStats(),
    }),
  };
};

// Simplified component optimization hook
export const useComponentOptimization = (componentName: string) => {
  return usePerformanceOptimization(componentName, {
    enableMemoryOptimization: true,
    enableCacheOptimization: false,
    enableWorkerOptimization: false,
    monitoringInterval: 10000,
  });
};

// Simplified page optimization hook
export const usePageOptimization = (pageName: string) => {
  return usePerformanceOptimization(pageName, {
    enableMemoryOptimization: true,
    enableCacheOptimization: true,
    enableWorkerOptimization: true,
    monitoringInterval: 5000,
  });
};

export default usePerformanceOptimization;