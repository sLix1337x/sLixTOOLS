/**
 * Simplified memory management utilities
 * Basic cleanup and monitoring for essential features
 */

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

// Type definition for Performance API with memory extension
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Enhanced error logging for memory management
const logMemoryError = (context: string, error: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[MemoryManager] ${context}:`, error);
  }
};

// Basic memory manager for cleanup tasks
export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Set<() => void> = new Set();
  private isDestroyed = false;

  private constructor() {
    try {
      this.setupCleanupListeners();
    } catch (error) {
      logMemoryError('Failed to setup cleanup listeners', error);
    }
  }

  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager();
    }
    return this.instance;
  }

  private setupCleanupListeners() {
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        try {
          this.cleanup();
        } catch (error) {
          logMemoryError('Cleanup during beforeunload failed', error);
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Store reference for potential cleanup
      this.registerCleanupTask(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      });
    }
  }

  registerCleanupTask(task: () => void): () => void {
    if (this.isDestroyed) {
      logMemoryError('Attempted to register cleanup task on destroyed manager', new Error('Manager destroyed'));
      return () => {}; // Return no-op function
    }

    if (typeof task !== 'function') {
      logMemoryError('Invalid cleanup task provided', new Error('Task must be a function'));
      return () => {};
    }

    this.cleanupTasks.add(task);
    return () => {
      this.cleanupTasks.delete(task);
    };
  }

  getMemoryUsage(): MemoryMetrics | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const performanceWithMemory = performance as PerformanceWithMemory;
      if (!performanceWithMemory.memory) {
        return null;
      }

      const memory = performanceWithMemory.memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
    } catch (error) {
      logMemoryError('Failed to get memory usage', error);
      return null;
    }
  }

  // Enhanced cleanup with better error handling
  cleanup(): void {
    if (this.isDestroyed) {
      return;
    }

    const failedTasks: Array<{ task: () => void; error: unknown }> = [];

    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        failedTasks.push({ task, error });
        logMemoryError('Cleanup task failed', error);
      }
    });

    // Report failed tasks in development
    if (failedTasks.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`[MemoryManager] ${failedTasks.length} cleanup tasks failed`);
    }
  }

  // Enhanced destroy with proper cleanup
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    try {
      this.cleanup();
      this.cleanupTasks.clear();
      this.isDestroyed = true;
    } catch (error) {
      logMemoryError('Failed to destroy memory manager', error);
    }
  }

  // Memory leak detection helper
  detectPotentialLeaks(): { taskCount: number; isDestroyed: boolean; memoryUsage: MemoryMetrics | null } {
    return {
      taskCount: this.cleanupTasks.size,
      isDestroyed: this.isDestroyed,
      memoryUsage: this.getMemoryUsage(),
    };
  }
}

// Simple cache with basic size limits
export class SimpleCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const useMemoryManager = () => {
  const memoryManager = MemoryManager.getInstance();
  
  return {
    registerCleanup: (task: () => void) => memoryManager.registerCleanupTask(task),
    getMemoryUsage: () => memoryManager.getMemoryUsage(),
    cleanup: () => memoryManager.cleanup(),
  };
};

export const memoryManager = MemoryManager.getInstance();
export const globalCache = new SimpleCache();