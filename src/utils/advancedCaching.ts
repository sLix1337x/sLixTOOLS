/**
 * Advanced Caching Utility
 * Provides sophisticated caching mechanisms for file processing and data storage
 */

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  maxSize?: number; // Maximum cache size in bytes
  maxAge?: number; // Maximum age in milliseconds
  maxEntries?: number; // Maximum number of entries
  compressionEnabled?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 50 * 1024 * 1024, // 50MB default
      maxAge: options.maxAge || 30 * 60 * 1000, // 30 minutes default
      maxEntries: options.maxEntries || 100,
      compressionEnabled: options.compressionEnabled || false
    };

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const now = Date.now();
    const ttl = customTTL || this.options.maxAge;
    const size = this.calculateSize(data);

    // Check if we need to evict entries
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      totalEntries: this.cache.size,
      totalSize: this.getTotalSize(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictionCount: this.stats.evictions
    };
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: unknown): number {
    if (data instanceof Blob) {
      return data.size;
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (typeof data === 'string') {
      return data.length * 2; // Approximate UTF-16 encoding
    }
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data).length * 2;
    }
    return 64; // Default size for primitives
  }

  /**
   * Get total cache size
   */
  private getTotalSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Evict entries if needed to make space
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Check entry count limit
    if (this.cache.size >= this.options.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    // Check size limit
    while (this.getTotalSize() + newEntrySize > this.options.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Create default cache instance
export const defaultCache = new AdvancedCache();

// File-specific cache for processed files
export const fileCache = new AdvancedCache({
  maxSize: 100 * 1024 * 1024, // 100MB for files
  maxAge: 60 * 60 * 1000, // 1 hour
  maxEntries: 50
});

// Memory-efficient cache for metadata
export const metadataCache = new AdvancedCache({
  maxSize: 10 * 1024 * 1024, // 10MB for metadata
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 1000
});

export { AdvancedCache };