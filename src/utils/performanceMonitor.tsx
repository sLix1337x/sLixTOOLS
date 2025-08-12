// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  componentRenderTime: number;
  memoryUsage?: number;
  bundleSize?: number;
  loadTime: number;
  interactionDelay: number;
}

interface ComponentMetrics {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryLeaks: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, ComponentMetrics>();
  private observers = new Map<string, PerformanceObserver>();
  private isEnabled = process.env.NODE_ENV === 'development';

  constructor() {
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: PerformanceEntry & { duration?: number }) => {
          if (entry.duration > 50) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Long task detected: ${entry.duration}ms`, entry);
            }
          }
        });
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Long task observer not supported');
        }
      }
    }

    // Monitor layout shifts
    if ('PerformanceObserver' in window) {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        if (clsValue > 0.1) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`High Cumulative Layout Shift: ${clsValue}`);
          }
        }
      });
      
      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutShiftObserver);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Layout shift observer not supported');
        }
      }
    }
  }

  // Track component render performance
  startComponentRender(componentName: string): () => void {
    if (!this.isEnabled) return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateComponentMetrics(componentName, renderTime);
      
      if (renderTime > 16) { // More than one frame at 60fps
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  }

  private updateComponentMetrics(componentName: string, renderTime: number) {
    const existing = this.metrics.get(componentName) || {
      name: componentName,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      memoryLeaks: 0
    };

    existing.renderCount++;
    existing.totalRenderTime += renderTime;
    existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
    existing.lastRenderTime = renderTime;

    this.metrics.set(componentName, existing);
  }

  // Memory usage tracking
  trackMemoryUsage(componentName: string) {
    if (!this.isEnabled || !('memory' in performance)) return;
    
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const usage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
    
    // Check for potential memory leaks
    const usageRatio = usage.used / usage.total;
    if (usageRatio > 0.9) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`High memory usage in ${componentName}: ${(usageRatio * 100).toFixed(1)}%`);
      }
      
      const metrics = this.metrics.get(componentName);
      if (metrics) {
        metrics.memoryLeaks++;
      }
    }
    
    return usage;
  }

  // Bundle size analysis
  analyzeBundleSize() {
    if (!this.isEnabled) return;
    
    // Estimate bundle size from loaded scripts
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src && !src.includes('node_modules')) {
        // This is a rough estimation - in production you'd want actual bundle analysis
        fetch(src, { method: 'HEAD' })
          .then(response => {
            const size = response.headers.get('content-length');
            if (size) {
              totalSize += parseInt(size);
              if (process.env.NODE_ENV === 'development') {
                console.log(`Bundle chunk: ${src.split('/').pop()} - ${(parseInt(size) / 1024).toFixed(1)}KB`);
              }
            }
          })
          .catch(() => {}); // Silent fail
      }
    });
  }

  // FPS monitoring
  startFPSMonitoring(duration = 5000): Promise<number> {
    if (!this.isEnabled) return Promise.resolve(60);
    
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      const countFrame = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - startTime < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = Math.round((frameCount * 1000) / (currentTime - startTime));
          resolve(fps);
        }
      };
      
      requestAnimationFrame(countFrame);
    });
  }

  // Get performance report
  getPerformanceReport(): ComponentMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// React hook for component performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = getPerformanceMonitor();
  
  const startRender = () => monitor.startComponentRender(componentName);
  const trackMemory = () => monitor.trackMemoryUsage(componentName);
  
  return { startRender, trackMemory };
};

// HOC for automatic performance monitoring
export const withPerformanceMonitor = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = React.forwardRef<unknown, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const { startRender, trackMemory } = usePerformanceMonitor(name);
    
    React.useEffect(() => {
      const endRender = startRender();
      trackMemory();
      return endRender;
    });
    
    return <Component {...props} ref={ref} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitor(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export const getPerformanceMonitor = () => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
};

// Performance optimization recommendations
export const getOptimizationRecommendations = () => {
  const monitor = getPerformanceMonitor();
  const report = monitor.getPerformanceReport();
  const recommendations: string[] = [];
  
  report.forEach(metric => {
    if (metric.averageRenderTime > 16) {
      recommendations.push(`Consider optimizing ${metric.name} - average render time: ${metric.averageRenderTime.toFixed(2)}ms`);
    }
    
    if (metric.renderCount > 100 && metric.averageRenderTime > 5) {
      recommendations.push(`${metric.name} renders frequently (${metric.renderCount} times) - consider memoization`);
    }
    
    if (metric.memoryLeaks > 0) {
      recommendations.push(`Potential memory leaks detected in ${metric.name}`);
    }
  });
  
  return recommendations;
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  const monitor = getPerformanceMonitor();
  
  // Set up periodic reporting in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const recommendations = getOptimizationRecommendations();
      if (recommendations.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.group('Performance Recommendations');
          recommendations.forEach(rec => console.warn(rec));
          console.groupEnd();
        }
      }
    }, 30000); // Every 30 seconds
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    monitor.cleanup();
  });
  
  return monitor;
};

// Export React import for the HOC
import React from 'react';