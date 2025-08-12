/**
 * Advanced multi-layer caching system
 * Implements memory, session, local storage, and IndexedDB caching
 */

import { PERFORMANCE_CONFIG } from '@/config/performance';
import { MemoryAwareCache } from './memoryManager';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
}

type CacheLayer = 'memory' | 'session' | 'local' | 'indexeddb';

// Cache configuration for different data types
const CACHE_CONFIGS = {
  images: {
    layers: ['memory', 'indexeddb'] as CacheLayer[],
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  api: {
    layers: ['memory', 'session'] as CacheLayer[],
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  processed: {
    layers: ['memory', 'local', 'indexeddb'] as CacheLayer[],
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  temp: {
    layers: ['memory', 'session'] as CacheLayer[],
    ttl: 60 * 1000, // 1 minute
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

// IndexedDB wrapper for large data storage
class IndexedDBCache {
  private dbName = 'sLixTOOLS-Cache';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different cache types
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('processed')) {
          db.createObjectStore('processed', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
    
    return this.initPromise;
  }

  async get<T>(storeName: string, key: string): Promise<CacheEntry<T> | null> {
    await this.init();
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.entry) {
          resolve(result.entry);
        } else {
          resolve(null);
        }
      };
    });
  }

  async set<T>(storeName: string, key: string, entry: CacheEntry<T>): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ key, entry });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllKeys(storeName: string): Promise<string[]> {
    await this.init();
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }
}

// Multi-layer cache implementation
export class AdvancedCache<T = unknown> {
  private memoryCache = new MemoryAwareCache<string, CacheEntry<T>>();
  private indexedDBCache = new IndexedDBCache();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
    hitRate: 0,
  };
  private cacheType: keyof typeof CACHE_CONFIGS;
  private version = '1.0.0';

  constructor(cacheType: keyof typeof CACHE_CONFIGS) {
    this.cacheType = cacheType;
    this.setupCleanup();
  }

  private setupCleanup() {
    // Periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup on page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.cleanup();
        }
      });
    }
  }

  private getConfig() {
    return CACHE_CONFIGS[this.cacheType];
  }

  private createCacheEntry(data: T, ttl?: number): CacheEntry<T> {
    const config = this.getConfig();
    return {
      data,
      timestamp: Date.now(),
      ttl: ttl || config.ttl,
      version: this.version,
      size: this.estimateSize(data),
      accessCount: 0,
      lastAccessed: Date.now(),
    };
  }

  private estimateSize(data: T): number {
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    // Rough estimate for objects
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 1024; // Default estimate
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessInfo(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  // Get from memory cache
  private async getFromMemory(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessInfo(entry);
      this.stats.hits++;
      return entry.data;
    }
    return null;
  }

  // Get from session storage
  private async getFromSession(key: string): Promise<T | null> {
    if (typeof sessionStorage === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(`cache_${this.cacheType}_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          this.updateAccessInfo(entry);
          // Promote to memory cache
          this.memoryCache.set(key, entry);
          this.stats.hits++;
          return entry.data;
        } else {
          sessionStorage.removeItem(`cache_${this.cacheType}_${key}`);
        }
      }
    } catch (error) {
      console.warn('Session storage error:', error);
    }
    return null;
  }

  // Get from local storage
  private async getFromLocal(key: string): Promise<T | null> {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`cache_${this.cacheType}_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          this.updateAccessInfo(entry);
          // Promote to higher cache layers
          this.memoryCache.set(key, entry);
          if (this.getConfig().layers.includes('session')) {
            sessionStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
          }
          this.stats.hits++;
          return entry.data;
        } else {
          localStorage.removeItem(`cache_${this.cacheType}_${key}`);
        }
      }
    } catch (error) {
      console.warn('Local storage error:', error);
    }
    return null;
  }

  // Get from IndexedDB
  private async getFromIndexedDB(key: string): Promise<T | null> {
    try {
      const entry = await this.indexedDBCache.get<T>(this.cacheType, key);
      if (entry && !this.isExpired(entry)) {
        this.updateAccessInfo(entry);
        // Promote to higher cache layers
        this.memoryCache.set(key, entry);
        const config = this.getConfig();
        if (config.layers.includes('session')) {
          sessionStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
        }
        if (config.layers.includes('local')) {
          localStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
        }
        this.stats.hits++;
        return entry.data;
      } else if (entry) {
        // Expired, remove it
        await this.indexedDBCache.delete(this.cacheType, key);
      }
    } catch (error) {
      console.warn('IndexedDB error:', error);
    }
    return null;
  }

  // Public API
  async get(key: string): Promise<T | null> {
    const config = this.getConfig();
    
    // Try each cache layer in order
    for (const layer of config.layers) {
      let result: T | null = null;
      
      switch (layer) {
        case 'memory':
          result = await this.getFromMemory(key);
          break;
        case 'session':
          result = await this.getFromSession(key);
          break;
        case 'local':
          result = await this.getFromLocal(key);
          break;
        case 'indexeddb':
          result = await this.getFromIndexedDB(key);
          break;
      }
      
      if (result !== null) {
        return result;
      }
    }
    
    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const config = this.getConfig();
    const entry = this.createCacheEntry(data, ttl);
    
    // Store in all configured cache layers
    const promises: Promise<void>[] = [];
    
    for (const layer of config.layers) {
      switch (layer) {
        case 'memory':
          this.memoryCache.set(key, entry);
          break;
        case 'session':
          if (typeof sessionStorage !== 'undefined') {
            try {
              sessionStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
            } catch (error) {
              console.warn('Session storage full:', error);
            }
          }
          break;
        case 'local':
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(`cache_${this.cacheType}_${key}`, JSON.stringify(entry));
            } catch (error) {
              console.warn('Local storage full:', error);
            }
          }
          break;
        case 'indexeddb':
          promises.push(this.indexedDBCache.set(this.cacheType, key, entry));
          break;
      }
    }
    
    await Promise.all(promises);
    this.stats.entries++;
    this.stats.size += entry.size;
  }

  async delete(key: string): Promise<void> {
    const config = this.getConfig();
    const promises: Promise<void>[] = [];
    
    // Remove from all cache layers
    for (const layer of config.layers) {
      switch (layer) {
        case 'memory':
          this.memoryCache.delete(key);
          break;
        case 'session':
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(`cache_${this.cacheType}_${key}`);
          }
          break;
        case 'local':
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`cache_${this.cacheType}_${key}`);
          }
          break;
        case 'indexeddb':
          promises.push(this.indexedDBCache.delete(this.cacheType, key));
          break;
      }
    }
    
    await Promise.all(promises);
    this.stats.entries = Math.max(0, this.stats.entries - 1);
  }

  async clear(): Promise<void> {
    const config = this.getConfig();
    const promises: Promise<void>[] = [];
    
    // Clear all cache layers
    for (const layer of config.layers) {
      switch (layer) {
        case 'memory':
          this.memoryCache.clear();
          break;
        case 'session':
          if (typeof sessionStorage !== 'undefined') {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith(`cache_${this.cacheType}_`)) {
                sessionStorage.removeItem(key);
              }
            });
          }
          break;
        case 'local':
          if (typeof localStorage !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(`cache_${this.cacheType}_`)) {
                localStorage.removeItem(key);
              }
            });
          }
          break;
        case 'indexeddb':
          promises.push(this.indexedDBCache.clear(this.cacheType));
          break;
      }
    }
    
    await Promise.all(promises);
    this.resetStats();
  }

  private async cleanup(): Promise<void> {
    // This is a simplified cleanup - in practice, you'd want more sophisticated LRU eviction
    const config = this.getConfig();
    
    if (this.stats.size > config.maxSize) {
      console.log(`Cache ${this.cacheType} exceeds max size, performing cleanup`);
      // Implement LRU eviction logic here
      // For now, just clear everything
      await this.clear();
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

  // Utility methods
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async keys(): Promise<string[]> {
    // This would need to be implemented to collect keys from all layers
    // For now, just return IndexedDB keys if available
    try {
      return await this.indexedDBCache.getAllKeys(this.cacheType);
    } catch {
      return [];
    }
  }
}

// Cache manager for different data types
export class CacheManager {
  private static instance: CacheManager;
  private caches = new Map<string, AdvancedCache>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!this.instance) {
      this.instance = new CacheManager();
    }
    return this.instance;
  }

  getCache<T>(type: keyof typeof CACHE_CONFIGS): AdvancedCache<T> {
    if (!this.caches.has(type)) {
      this.caches.set(type, new AdvancedCache<T>(type));
    }
    return this.caches.get(type)! as AdvancedCache<T>;
  }

  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.clear());
    await Promise.all(promises);
  }

  getAllStats() {
    const stats: Record<string, CacheStats> = {};
    this.caches.forEach((cache, type) => {
      stats[type] = cache.getStats();
    });
    return stats;
  }
}

// Convenience functions
export const cacheManager = CacheManager.getInstance();

export const imageCache = cacheManager.getCache<Blob>('images');
export const apiCache = cacheManager.getCache<Record<string, unknown>>('api');
export const processedCache = cacheManager.getCache<Blob | ArrayBuffer | string>('processed');
export const tempCache = cacheManager.getCache<unknown>('temp');

// React hook for caching
export const useAdvancedCache = <T>(type: keyof typeof CACHE_CONFIGS) => {
  const cache = cacheManager.getCache<T>(type);
  
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, data: T, ttl?: number) => cache.set(key, data, ttl),
    delete: (key: string) => cache.delete(key),
    clear: () => cache.clear(),
    has: (key: string) => cache.has(key),
    getStats: () => cache.getStats(),
  };
};