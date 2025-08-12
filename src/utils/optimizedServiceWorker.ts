/**
 * Optimized Service Worker with advanced caching strategies
 * Implements background sync, push notifications, and performance optimizations
 */

import { PERFORMANCE_CONFIG } from '@/config/performance';

// Cache names
const CACHE_NAMES = {
  static: 'sLixTOOLS-static-v1',
  dynamic: 'sLixTOOLS-dynamic-v1',
  images: 'sLixTOOLS-images-v1',
  api: 'sLixTOOLS-api-v1',
  fonts: 'sLixTOOLS-fonts-v1',
  offline: 'sLixTOOLS-offline-v1',
};

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
} as const;

type CacheStrategy = typeof CACHE_STRATEGIES[keyof typeof CACHE_STRATEGIES];

interface RouteConfig {
  pattern: RegExp;
  strategy: CacheStrategy;
  cacheName: string;
  options?: {
    maxEntries?: number;
    maxAgeSeconds?: number;
    purgeOnQuotaError?: boolean;
    networkTimeoutSeconds?: number;
  };
}

// Route configurations
const ROUTE_CONFIGS: RouteConfig[] = [
  // Static assets (HTML, CSS, JS)
  {
    pattern: /\.(html|css|js)$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: CACHE_NAMES.static,
    options: {
      maxEntries: 100,
      maxAgeSeconds: 24 * 60 * 60, // 24 hours
    },
  },
  
  // Images
  {
    pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: CACHE_NAMES.images,
    options: {
      maxEntries: 200,
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      purgeOnQuotaError: true,
    },
  },
  
  // Fonts
  {
    pattern: /\.(woff|woff2|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: CACHE_NAMES.fonts,
    options: {
      maxEntries: 30,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    },
  },
  
  // API calls
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: CACHE_NAMES.api,
    options: {
      maxEntries: 50,
      maxAgeSeconds: 5 * 60, // 5 minutes
      networkTimeoutSeconds: 3,
    },
  },
  
  // Dynamic content
  {
    pattern: /.*/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: CACHE_NAMES.dynamic,
    options: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60, // 1 hour
    },
  },
];

// Critical resources to precache
const PRECACHE_RESOURCES = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add other critical resources
];

// Background sync tags
const SYNC_TAGS = {
  ANALYTICS: 'analytics-sync',
  USER_DATA: 'user-data-sync',
  CACHE_CLEANUP: 'cache-cleanup-sync',
};

class OptimizedServiceWorker {
  private isOnline = true;
  private syncQueue: Array<{ tag: string; data: unknown }> = [];
  private performanceMetrics = new Map<string, number>();

  constructor() {
    this.setupEventListeners();
    this.initializePerformanceMonitoring();
  }

  private setupEventListeners() {
    self.addEventListener('install', this.handleInstall.bind(this));
    self.addEventListener('activate', this.handleActivate.bind(this));
    self.addEventListener('fetch', this.handleFetch.bind(this));
    self.addEventListener('sync', this.handleBackgroundSync.bind(this));
    self.addEventListener('message', this.handleMessage.bind(this));
    self.addEventListener('push', this.handlePush.bind(this));
    self.addEventListener('notificationclick', this.handleNotificationClick.bind(this));
  }

  private initializePerformanceMonitoring() {
    // Monitor cache performance
    setInterval(() => {
      this.collectCacheMetrics();
    }, 60000); // Every minute
  }

  private async handleInstall(event: ExtendableEvent) {
    console.log('Service Worker installing...');
    
    event.waitUntil(
      Promise.all([
        this.precacheResources(),
        this.setupOfflinePage(),
        (self as ServiceWorkerGlobalScope).skipWaiting(),
      ])
    );
  }

  private async handleActivate(event: ExtendableEvent) {
    console.log('Service Worker activating...');
    
    event.waitUntil(
      Promise.all([
        this.cleanupOldCaches(),
        (self as ServiceWorkerGlobalScope).clients.claim(),
        this.initializeBackgroundSync(),
      ])
    );
  }

  private async precacheResources() {
    const cache = await caches.open(CACHE_NAMES.static);
    
    try {
      await cache.addAll(PRECACHE_RESOURCES);
      console.log('Precached resources successfully');
    } catch (error) {
      console.error('Failed to precache resources:', error);
      // Fallback: cache resources individually
      for (const resource of PRECACHE_RESOURCES) {
        try {
          await cache.add(resource);
        } catch (err) {
          console.warn(`Failed to cache ${resource}:`, err);
        }
      }
    }
  }

  private async setupOfflinePage() {
    const cache = await caches.open(CACHE_NAMES.offline);
    
    const offlineHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offline - sLixTOOLS</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; 
                      padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .icon { font-size: 48px; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 10px; }
          p { color: #666; line-height: 1.5; }
          .retry-btn { background: #007bff; color: white; border: none; 
                      padding: 12px 24px; border-radius: 4px; cursor: pointer; 
                      font-size: 16px; margin-top: 20px; }
          .retry-btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>You're Offline</h1>
          <p>It looks like you're not connected to the internet. Some features may not be available until you reconnect.</p>
          <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
        </div>
        <script>
          // Auto-retry when online
          window.addEventListener('online', () => {
            window.location.reload();
          });
        </script>
      </body>
      </html>
    `;
    
    await cache.put('/offline.html', new Response(offlineHTML, {
      headers: { 'Content-Type': 'text/html' },
    }));
  }

  private async cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = Object.values(CACHE_NAMES);
    
    const deletePromises = cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => caches.delete(cacheName));
    
    await Promise.all(deletePromises);
    console.log('Cleaned up old caches');
  }

  private async handleFetch(event: FetchEvent) {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
      return;
    }
    
    // Find matching route configuration
    const routeConfig = this.findRouteConfig(request.url);
    
    if (routeConfig) {
      event.respondWith(this.handleRequest(request, routeConfig));
    }
  }

  private findRouteConfig(url: string): RouteConfig | null {
    return ROUTE_CONFIGS.find(config => config.pattern.test(url)) || null;
  }

  private async handleRequest(request: Request, config: RouteConfig): Promise<Response> {
    const startTime = performance.now();
    
    try {
      let response: Response;
      
      switch (config.strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
          response = await this.cacheFirst(request, config);
          break;
        case CACHE_STRATEGIES.NETWORK_FIRST:
          response = await this.networkFirst(request, config);
          break;
        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
          response = await this.staleWhileRevalidate(request, config);
          break;
        case CACHE_STRATEGIES.NETWORK_ONLY:
          response = await fetch(request);
          break;
        case CACHE_STRATEGIES.CACHE_ONLY:
          response = await this.cacheOnly(request, config);
          break;
        default:
          response = await fetch(request);
      }
      
      // Record performance metrics
      const duration = performance.now() - startTime;
      this.recordMetric(`${config.strategy}-${config.cacheName}`, duration);
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      return this.handleRequestError(request, error);
    }
  }

  private async cacheFirst(request: Request, config: RouteConfig): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !this.isExpired(cachedResponse, config.options?.maxAgeSeconds)) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await this.cacheResponse(cache, request, networkResponse.clone(), config.options);
      }
      return networkResponse;
    } catch (error) {
      if (cachedResponse) {
        return cachedResponse; // Return stale cache as fallback
      }
      throw error;
    }
  }

  private async networkFirst(request: Request, config: RouteConfig): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const timeoutMs = (config.options?.networkTimeoutSeconds || 3) * 1000;
    
    try {
      const networkResponse = await this.fetchWithTimeout(request, timeoutMs);
      if (networkResponse.ok) {
        await this.cacheResponse(cache, request, networkResponse.clone(), config.options);
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  private async staleWhileRevalidate(request: Request, config: RouteConfig): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request);
    
    // Start network request in background
    const networkPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        await this.cacheResponse(cache, request, networkResponse.clone(), config.options);
      }
      return networkResponse;
    }).catch(error => {
      console.warn('Background network request failed:', error);
    });
    
    // Return cached response immediately if available
    if (cachedResponse && !this.isExpired(cachedResponse, config.options?.maxAgeSeconds)) {
      // Don't await the network promise to return cached response immediately
      void networkPromise;
      return cachedResponse;
    }
    
    // Wait for network response if no cache or cache is expired
    try {
      return await networkPromise;
    } catch (error) {
      if (cachedResponse) {
        return cachedResponse; // Return stale cache as fallback
      }
      throw error;
    }
  }

  private async cacheOnly(request: Request, config: RouteConfig): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw new Error('No cached response available');
  }

  private async fetchWithTimeout(request: Request, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async cacheResponse(
    cache: Cache,
    request: Request,
    response: Response,
    options?: RouteConfig['options']
  ) {
    // Check cache size limits
    if (options?.maxEntries) {
      await this.enforceMaxEntries(cache, options.maxEntries);
    }
    
    // Add cache headers
    const responseWithHeaders = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'sw-cache-timestamp': Date.now().toString(),
      },
    });
    
    await cache.put(request, responseWithHeaders);
  }

  private isExpired(response: Response, maxAgeSeconds?: number): boolean {
    if (!maxAgeSeconds) return false;
    
    const cacheTimestamp = response.headers.get('sw-cache-timestamp');
    if (!cacheTimestamp) return false;
    
    const age = (Date.now() - parseInt(cacheTimestamp)) / 1000;
    return age > maxAgeSeconds;
  }

  private async enforceMaxEntries(cache: Cache, maxEntries: number) {
    const requests = await cache.keys();
    
    if (requests.length >= maxEntries) {
      // Remove oldest entries (simple FIFO, could be improved with LRU)
      const entriesToDelete = requests.slice(0, requests.length - maxEntries + 1);
      await Promise.all(entriesToDelete.map(request => cache.delete(request)));
    }
  }

  private async handleRequestError(request: Request, error: unknown): Promise<Response> {
    const url = new URL(request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(CACHE_NAMES.offline);
      const offlineResponse = await offlineCache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Return a generic error response
    return new Response(
      JSON.stringify({ error: 'Network request failed', offline: true }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleBackgroundSync(event: ExtendableEvent & { tag: string }) {
    console.log('Background sync triggered:', event.tag);
    
    switch (event.tag) {
      case SYNC_TAGS.ANALYTICS:
        event.waitUntil(this.syncAnalytics());
        break;
      case SYNC_TAGS.USER_DATA:
        event.waitUntil(this.syncUserData());
        break;
      case SYNC_TAGS.CACHE_CLEANUP:
        event.waitUntil(this.performCacheCleanup());
        break;
    }
  }

  private async syncAnalytics() {
    // Sync queued analytics data
    const queuedData = this.syncQueue.filter(item => item.tag === SYNC_TAGS.ANALYTICS);
    
    for (const item of queuedData) {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          body: JSON.stringify(item.data),
          headers: { 'Content-Type': 'application/json' },
        });
        
        // Remove from queue on success
        this.syncQueue = this.syncQueue.filter(queueItem => queueItem !== item);
      } catch (error) {
        console.error('Failed to sync analytics:', error);
      }
    }
  }

  private async syncUserData() {
    // Sync user data when back online
    console.log('Syncing user data...');
  }

  private async performCacheCleanup() {
    console.log('Performing cache cleanup...');
    
    // Clean up expired entries
    for (const cacheName of Object.values(CACHE_NAMES)) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && this.isExpired(response, 24 * 60 * 60)) { // 24 hours default
          await cache.delete(request);
        }
      }
    }
  }

  private async handleMessage(event: ExtendableMessageEvent) {
    const { data } = event;
    
    switch (data.type) {
      case 'SKIP_WAITING':
        (self as ServiceWorkerGlobalScope).skipWaiting();
        break;
      case 'GET_CACHE_STATS':
        event.ports[0].postMessage(await this.getCacheStats());
        break;
      case 'CLEAR_CACHE':
        await this.clearSpecificCache(data.cacheName);
        event.ports[0].postMessage({ success: true });
        break;
      case 'QUEUE_SYNC':
        this.queueBackgroundSync(data.tag, data.data);
        break;
    }
  }

  private async handlePush(event: PushEvent) {
    const options = {
      body: event.data?.text() || 'New notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          icon: '/icon-explore.png',
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-close.png',
        },
      ],
    };
    
    event.waitUntil(
      (self as ServiceWorkerGlobalScope).registration.showNotification('sLixTOOLS', options)
    );
  }

  private async handleNotificationClick(event: NotificationEvent) {
    event.notification.close();
    
    if (event.action === 'explore') {
      event.waitUntil(
        (self as ServiceWorkerGlobalScope).clients.openWindow('/')
      );
    }
  }

  private async initializeBackgroundSync() {
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await (self as ServiceWorkerGlobalScope).registration.sync.register(SYNC_TAGS.CACHE_CLEANUP);
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  }

  private queueBackgroundSync(tag: string, data: unknown) {
    this.syncQueue.push({ tag, data });
    
    // Try to register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      (self as ServiceWorkerGlobalScope).registration.sync.register(tag).catch((error: unknown) => {
        console.warn('Background sync registration failed:', error);
      });
    }
  }

  private recordMetric(key: string, value: number) {
    this.performanceMetrics.set(key, value);
  }

  private async collectCacheMetrics() {
    const metrics: Record<string, unknown> = {};
    
    for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        metrics[name] = {
          entries: requests.length,
          // Add more detailed metrics as needed
        };
      } catch (error) {
        console.warn(`Failed to collect metrics for cache ${name}:`, error);
      }
    }
    
    // Send metrics to main thread
    const clients = await (self as ServiceWorkerGlobalScope).clients.matchAll();
    clients.forEach((client: Client) => {
      client.postMessage({
        type: 'CACHE_METRICS',
        data: metrics,
      });
    });
  }

  private async getCacheStats() {
    const stats: Record<string, unknown> = {};
    
    for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      stats[name] = {
        entries: requests.length,
        name: cacheName,
      };
    }
    
    return stats;
  }

  private async clearSpecificCache(cacheName: string) {
    if (Object.values(CACHE_NAMES).includes(cacheName)) {
      await caches.delete(cacheName);
      console.log(`Cleared cache: ${cacheName}`);
    }
  }
}

// Initialize the service worker
if (typeof self !== 'undefined' && 'ServiceWorkerGlobalScope' in self) {
  new OptimizedServiceWorker();
}

// Export for use in main thread
export { OptimizedServiceWorker, CACHE_NAMES, SYNC_TAGS };