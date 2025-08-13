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

// Simplified memory manager
export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Set<() => void> = new Set();

  private constructor() {
    this.setupCleanupListeners();
  }

  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager();
    }
    return this.instance;
  }

  private setupCleanupListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  registerCleanupTask(task: () => void): () => void {
    this.cleanupTasks.add(task);
    return () => this.cleanupTasks.delete(task);
  }

  getMemoryUsage(): MemoryMetrics | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };
  }

  cleanup() {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
  }

  destroy() {
    this.cleanup();
    this.cleanupTasks.clear();
  }
}

// Simplified cache with basic size limits
export class MemoryAwareCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 100, maxAge = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    
    const memoryManager = MemoryManager.getInstance();
    memoryManager.registerCleanupTask(() => this.cleanup());
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
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
export const globalCache = new MemoryAwareCache();