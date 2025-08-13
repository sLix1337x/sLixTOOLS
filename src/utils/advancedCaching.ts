/**
 * Simplified caching system
 * Basic memory and session storage caching
 */

import { MemoryAwareCache } from './memoryManager';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
}

// Simplified cache configuration
const CACHE_CONFIGS = {
  default: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 30,
  },
  images: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 50,
  },
  api: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 20,
  },
  processed: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 100,
  },
  temp: {
    ttl: 60 * 1000, // 1 minute
    maxSize: 10,
  },
};

export class SimpleCache<T = unknown> {
  private memoryCache = new MemoryAwareCache<string, CacheEntry<T>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
    hitRate: 0,
  };
  private cacheType: keyof typeof CACHE_CONFIGS;

  constructor(cacheType: keyof typeof CACHE_CONFIGS) {
    this.cacheType = cacheType;
    this.setupCleanup();
  }

  private setupCleanup() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private getConfig() {
    return CACHE_CONFIGS[this.cacheType];
  }

  private createCacheEntry(data: T, ttl?: number): CacheEntry<T> {
    return {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.getConfig().ttl,
    };
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async get(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.stats.hits++;
      this.updateHitRate();
      return memoryEntry.data;
    }

    // Try session storage
    try {
      const sessionData = sessionStorage.getItem(`cache_${this.cacheType}_${key}`);
      if (sessionData) {
        const entry: CacheEntry<T> = JSON.parse(sessionData);
        if (!this.isExpired(entry)) {
          // Move back to memory cache
          this.memoryCache.set(key, entry);
          this.stats.hits++;
          this.updateHitRate();
          return entry.data;
        } else {
          // Remove expired entry
          sessionStorage.removeItem(`cache_${this.cacheType}_${key}`);
        }
      }
    } catch (error) {
      console.warn('Session storage error:', error);
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const entry = this.createCacheEntry(data, ttl);
    
    // Set in memory cache
    this.memoryCache.set(key, entry);
    
    // Set in session storage for persistence
    try {
      sessionStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Session storage error:', error);
    }
    
    this.stats.entries++;
    this.stats.size++;
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    try {
      sessionStorage.removeItem(`cache_${this.cacheType}_${key}`);
    } catch (error) {
      console.warn('Session storage error:', error);
    }
    
    this.stats.entries = Math.max(0, this.stats.entries - 1);
    this.stats.size = Math.max(0, this.stats.size - 1);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    // Clear session storage entries for this cache type
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`cache_${this.cacheType}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Session storage error:', error);
    }
    
    this.resetStats();
  }

  private cleanup(): void {
    // Clean up memory cache
    try {
      for (const key of this.memoryCache.keys()) {
        const entry = this.memoryCache.get(key);
        if (entry && this.isExpired(entry)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('Memory cache cleanup error:', error);
    }
    
    // Clean up session storage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`cache_${this.cacheType}_`)) {
          const data = sessionStorage.getItem(key);
          if (data) {
            const entry: CacheEntry<T> = JSON.parse(data);
            if (this.isExpired(entry)) {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Session storage cleanup error:', error);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async keys(): Promise<string[]> {
    const memoryKeys = this.memoryCache.keys();
    const sessionKeys: string[] = [];
    
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`cache_${this.cacheType}_`)) {
          const cacheKey = key.replace(`cache_${this.cacheType}_`, '');
          if (!memoryKeys.includes(cacheKey)) {
            sessionKeys.push(cacheKey);
          }
        }
      }
    } catch (error) {
      console.warn('Session storage error:', error);
    }
    
    return [...memoryKeys, ...sessionKeys];
  }
}

export class CacheManager {
  private static instance: CacheManager;
  private caches = new Map<string, SimpleCache>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  getCache<T>(type: keyof typeof CACHE_CONFIGS): SimpleCache<T> {
    if (!this.caches.has(type)) {
      this.caches.set(type, new SimpleCache<T>(type));
    }
    return this.caches.get(type) as SimpleCache<T>;
  }

  async clearAll(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.clear();
    }
  }

  getAllStats() {
    const stats: Record<string, CacheStats> = {};
    for (const [type, cache] of this.caches.entries()) {
      stats[type] = cache.getStats();
    }
    return stats;
  }
}

// Export singleton instance and specific caches
export const cacheManager = CacheManager.getInstance();

export const imageCache = cacheManager.getCache<Blob>('images');
export const apiCache = cacheManager.getCache<Record<string, unknown>>('api');
export const processedCache = cacheManager.getCache<Blob | ArrayBuffer | string>('processed');
export const tempCache = cacheManager.getCache<unknown>('temp');

// Export hook for React components
export const useAdvancedCache = <T>(type: keyof typeof CACHE_CONFIGS) => {
  const cache = cacheManager.getCache<T>(type);
  
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, data: T, ttl?: number) => cache.set(key, data, ttl),
    delete: (key: string) => cache.delete(key),
    clear: () => cache.clear(),
    has: (key: string) => cache.has(key),
    keys: () => cache.keys(),
    getStats: () => cache.getStats(),
  };
};