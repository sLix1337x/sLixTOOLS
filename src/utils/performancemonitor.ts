/**
 * Simplified performance monitoring utilities
 * Basic metrics tracking and memory monitoring
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'memory' | 'timing' | 'network' | 'rendering';
}

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  memory: MemoryInfo;
  score: number; // 0-100
}

export interface ComponentMetrics {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRender: number;
}

export class PerformanceMonitor {
  private metrics = new Map<string, ComponentMetrics>();
  private maxMetrics = 100;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupCleanup();
  }

  private setupCleanup() {
    // Clean up old metrics every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      for (const [key, metric] of this.metrics.entries()) {
        if (metric.lastRender < fiveMinutesAgo) {
          this.metrics.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  startComponentRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      this.recordMetric(componentName, renderTime);
    };
  }

  private recordMetric(componentName: string, renderTime: number) {
    const existing = this.metrics.get(componentName);
    
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.lastRender = Date.now();
    } else {
      this.metrics.set(componentName, {
        name: componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        averageRenderTime: renderTime,
        lastRender: Date.now(),
      });
    }
  }

  getMemoryUsage(): MemoryInfo | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }

  generateReport(): PerformanceReport {
    const memory = this.getMemoryUsage();
    const metrics: PerformanceMetric[] = [];
    
    // Convert component metrics to performance metrics
    for (const [name, componentMetric] of this.metrics.entries()) {
      metrics.push({
        name: `${name}_render_time`,
        value: componentMetric.averageRenderTime,
        timestamp: componentMetric.lastRender,
        category: 'rendering'
      });
    }
    
    // Calculate performance score (0-100)
    let score = 100;
    if (memory && memory.percentage > 80) score -= 20;
    
    const avgRenderTime = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    if (avgRenderTime > 16) score -= 30; // 60fps threshold
    
    return {
      timestamp: Date.now(),
      metrics,
      memory: memory || { used: 0, total: 0, percentage: 0 },
      score: Math.max(0, score)
    };
  }

  getPerformanceReport(): ComponentMetrics[] {
    return Array.from(this.metrics.values());
  }

  getComponentMetrics(componentName: string): ComponentMetrics | undefined {
    return this.metrics.get(componentName);
  }

  clearMetrics() {
    this.metrics.clear();
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.metrics.clear();
  }

  // Simple function timing
  measureFunction<T>(fn: () => T, name: string): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }

  async measureAsyncFunction<T>(fn: () => Promise<T>, name: string): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }

  trackMemoryUsage(componentName: string): void {
    const memory = this.getMemoryUsage();
    if (memory) {
      console.log(`Memory usage for ${componentName}: ${(memory.used / 1024 / 1024).toFixed(2)}MB (${memory.percentage.toFixed(1)}%)`);
      
      // Log warning if memory usage is high
      if (memory.percentage > 80) {
        console.warn(`High memory usage detected in ${componentName}: ${memory.percentage.toFixed(1)}%`);
      }
    }
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export const getPerformanceMonitor = () => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
};

// Simple optimization recommendations
export const getOptimizationRecommendations = () => {
  const monitor = getPerformanceMonitor();
  const memory = monitor.getMemoryUsage();
  const recommendations: string[] = [];
  
  if (memory && memory.percentage > 80) {
    recommendations.push('High memory usage detected. Consider clearing caches or reducing data retention.');
  }
  
  const metrics = monitor.getPerformanceReport();
  const slowComponents = metrics.filter(m => m.averageRenderTime > 16);
  
  if (slowComponents.length > 0) {
    recommendations.push(`Slow rendering detected in: ${slowComponents.map(c => c.name).join(', ')}`);
  }
  
  return recommendations;
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (performanceMonitor) {
      performanceMonitor.cleanup();
    }
  });
}