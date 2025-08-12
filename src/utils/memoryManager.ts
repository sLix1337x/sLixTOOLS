/**
 * Advanced memory management utilities
 * Prevents memory leaks and optimizes garbage collection
 */

import { PERFORMANCE_CONFIG } from '@/config/performance';

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface MemoryLeak {
  component: string;
  size: number;
  timestamp: number;
  stackTrace?: string;
}

// Memory monitoring and cleanup
export class MemoryManager {
  private static instance: MemoryManager;
  private metrics: MemoryMetrics[] = [];
  private leaks: MemoryLeak[] = [];
  private cleanupTasks: Set<() => void> = new Set();
  private intervalId?: NodeJS.Timeout;
  private weakRefs = new Set<WeakRef<object>>();
  private objectRegistry = new Map<string, WeakRef<object>>();

  private constructor() {
    this.startMonitoring();
    this.setupCleanupListeners();
  }

  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager();
    }
    return this.instance;
  }

  private startMonitoring() {
    if (!PERFORMANCE_CONFIG.memory.enableCleanup) return;

    this.intervalId = setInterval(() => {
      this.collectMetrics();
      this.detectLeaks();
      this.performCleanup();
    }, PERFORMANCE_CONFIG.memory.cleanupInterval);
  }

  private setupCleanupListeners() {
    if (typeof window === 'undefined') return;

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });

    // Cleanup on memory pressure
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memory && memory.usedJSHeapSize > PERFORMANCE_CONFIG.memory.maxCacheSize * 1024 * 1024) {
          this.performEmergencyCleanup();
        }
      };

      setInterval(checkMemoryPressure, 5000);
    }

    // Cleanup before page unload
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  private collectMetrics() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private detectLeaks() {
    if (this.metrics.length < 10) return;

    const recent = this.metrics.slice(-10);
    const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
    const threshold = PERFORMANCE_CONFIG.monitoring.memoryLeakThreshold * 1024 * 1024;

    if (growth > threshold) {
      const leak: MemoryLeak = {
        component: 'unknown',
        size: growth,
        timestamp: Date.now(),
        stackTrace: new Error().stack,
      };

      this.leaks.push(leak);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Potential memory leak detected:', leak);
      }

      // Trigger emergency cleanup
      this.performEmergencyCleanup();
    }
  }

  private performCleanup() {
    if (this.shouldTriggerCleanup()) {
      this.runCleanupTasks();
      this.cleanupWeakRefs();
      this.cleanupUnusedObjects();
      this.optimizeMemoryUsage();
      this.suggestGC();
    }
  }

  private shouldTriggerCleanup(): boolean {
    const currentMetrics = this.getMemoryUsage();
    if (!currentMetrics) return this.cleanupTasks.size > 0;
    
    const memoryUsageRatio = currentMetrics.usedJSHeapSize / currentMetrics.jsHeapSizeLimit;
    return memoryUsageRatio > 0.7 || this.cleanupTasks.size > 0;
  }

  private runCleanupTasks() {
    // Execute all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Error during cleanup task:', error);
      }
    });
    
    // Clear cleanup tasks set
    this.cleanupTasks.clear();
  }

  private cleanupUnusedObjects() {
    // Clean up unused objects from registry
    for (const [key, weakRef] of this.objectRegistry.entries()) {
      if (!weakRef.deref()) {
        this.objectRegistry.delete(key);
      }
    }
  }

  private optimizeMemoryUsage() {
    const currentMetrics = this.getMemoryUsage();
    if (currentMetrics && currentMetrics.usedJSHeapSize > PERFORMANCE_CONFIG.memory.maxCacheSize * 1024 * 1024 * 0.8) {
      // Force cleanup when approaching memory limit
      this.forceCleanup();
    }
  }

  private forceCleanup() {
    // Clear all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Error during forced cleanup:', error);
      }
    });
    
    // Clear weak references
    this.weakRefs.clear();
    
    // Clear object registry
    this.objectRegistry.clear();
    
    // Suggest aggressive garbage collection
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as typeof window & { gc?: () => void }).gc?.();
    }
  }

  private performEmergencyCleanup() {
    console.warn('Performing emergency memory cleanup');

    // Clear all caches
    this.clearAllCaches();

    // Force cleanup of weak references
    this.cleanupWeakRefs();

    // Clear metrics history
    this.metrics = this.metrics.slice(-10);
    this.leaks = this.leaks.slice(-5);

    // Force garbage collection
    this.forceGC();
  }

  private cleanupWeakRefs() {
    const toRemove: WeakRef<object>[] = [];

    this.weakRefs.forEach(ref => {
      if (ref.deref() === undefined) {
        toRemove.push(ref);
      }
    });

    toRemove.forEach(ref => this.weakRefs.delete(ref));

    // Clean up object registry
    const registryToRemove: string[] = [];
    this.objectRegistry.forEach((ref, key) => {
      if (ref.deref() === undefined) {
        registryToRemove.push(key);
      }
    });

    registryToRemove.forEach(key => this.objectRegistry.delete(key));
  }

  private clearAllCaches() {
    // Clear various browser caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('cache')) {
            caches.delete(name);
          }
        });
      });
    }

    // Clear session storage of temporary data
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('temp') || key.includes('cache')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  private suggestGC() {
    // Modern browsers handle GC automatically, but we can hint
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Perform low-priority cleanup during idle time
        this.cleanupWeakRefs();
      });
    }
  }

  private forceGC() {
    // Force GC in development (Chrome DevTools)
    if (process.env.NODE_ENV === 'development' && (window as typeof window & { gc?: () => void }).gc) {
      (window as typeof window & { gc: () => void }).gc();
    }
  }

  // Public API
  registerCleanupTask(task: () => void): () => void {
    this.cleanupTasks.add(task);
    return () => this.cleanupTasks.delete(task);
  }

  trackObject<T extends object>(obj: T, id?: string): WeakRef<T> {
    const ref = new WeakRef(obj);
    this.weakRefs.add(ref);

    if (id) {
      this.objectRegistry.set(id, ref);
    }

    return ref;
  }

  getTrackedObject<T>(id: string): T | undefined {
    const ref = this.objectRegistry.get(id);
    return ref?.deref() as T | undefined;
  }

  registerObject<T extends object>(obj: T, id?: string): string {
    const objectId = id || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.trackObject(obj, objectId);
    return objectId;
  }

  unregisterObject(id: string): boolean {
    const existed = this.objectRegistry.has(id);
    this.objectRegistry.delete(id);
    return existed;
  }

  getMemoryUsage(): MemoryMetrics | null {
    if (typeof window === 'undefined' || !('memory' in performance) || !performance.memory) {
      return null;
    }

    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };
  }

  getMemoryMetrics(): MemoryMetrics[] {
    return [...this.metrics];
  }

  getMemoryLeaks(): MemoryLeak[] {
    return [...this.leaks];
  }

  clearMetrics() {
    this.metrics = [];
    this.leaks = [];
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.performCleanup();
    this.cleanupTasks.clear();
    this.weakRefs.clear();
    this.objectRegistry.clear();
    this.metrics = [];
    this.leaks = [];
  }
}

// Memory-aware cache implementation
export class MemoryAwareCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; size: number }>();
  private maxSize: number;
  private maxAge: number;
  private currentSize = 0;

  constructor(maxSize = 50 * 1024 * 1024, maxAge = 30 * 60 * 1000) { // 50MB, 30min
    this.maxSize = maxSize;
    this.maxAge = maxAge;

    // Register cleanup with memory manager
    const memoryManager = MemoryManager.getInstance();
    memoryManager.registerCleanupTask(() => this.cleanup());
  }

  set(key: K, value: V): void {
    const size = this.estimateSize(value);
    
    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.currentSize -= this.cache.get(key)!.size;
    }

    // Check if we need to make space
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      size,
    });

    this.currentSize += size;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  private evictOldest(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: K[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.maxAge) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.delete(key));
  }

  private estimateSize(value: V): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    if (value instanceof Blob) {
      return value.size;
    }
    // Rough estimate for objects
    return JSON.stringify(value).length * 2;
  }

  getStats() {
    return {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      hitRate: 0, // Could be implemented with counters
    };
  }
}

// React hook for memory management
export const useMemoryManager = () => {
  const memoryManager = MemoryManager.getInstance();

  const registerCleanup = (task: () => void) => {
    return memoryManager.registerCleanupTask(task);
  };

  const trackObject = <T extends object>(obj: T, id?: string) => {
    return memoryManager.trackObject(obj, id);
  };

  const getMemoryUsage = () => {
    return memoryManager.getMemoryUsage();
  };

  return {
    registerCleanup,
    trackObject,
    getMemoryUsage,
    getMetrics: () => memoryManager.getMemoryMetrics(),
    getLeaks: () => memoryManager.getMemoryLeaks(),
  };
};

// Global memory manager instance
export const memoryManager = MemoryManager.getInstance();

// Export cache for global use
export const globalCache = new MemoryAwareCache();