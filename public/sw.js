// Enhanced Service Worker for sLixTOOLS
// Provides advanced caching, offline functionality, and performance optimization

const CACHE_NAME = 'slixtools-v1.2.0';
const STATIC_CACHE = 'slixtools-static-v1.2.0';
const DYNAMIC_CACHE = 'slixtools-dynamic-v1.2.0';
const IMAGE_CACHE = 'slixtools-images-v1.2.0';
const API_CACHE = 'slixtools-api-v1.2.0';

// Cache size limits (in MB)
const CACHE_LIMITS = {
  static: 50,
  dynamic: 100,
  images: 200,
  api: 20
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 24 * 60 * 60 * 1000, // 1 day
  images: 3 * 24 * 60 * 60 * 1000, // 3 days
  api: 5 * 60 * 1000 // 5 minutes
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',

];

// Dynamic routes that should be cached
const DYNAMIC_ROUTES = [
  '/video-to-gif',
  '/gif-compressor',
  '/image-compressor',
  '/about',
  '/contact',
  '/privacy-policy'
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/audio/info',
  '/api/video/info'
];

// Network-first strategies for these patterns
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//
];

// Cache-first strategies for these patterns
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|woff2?|ttf|eot)$/,
  /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
  /\/static\//
];

// Utility functions
const isStaticAsset = (url) => {
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url));
};

const isApiRequest = (url) => {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url));
};

const getCacheNameForRequest = (request) => {
  const url = new URL(request.url);
  
  if (isStaticAsset(url.pathname)) {
    return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/) ? IMAGE_CACHE : STATIC_CACHE;
  }
  
  if (isApiRequest(url.pathname)) {
    return API_CACHE;
  }
  
  return DYNAMIC_CACHE;
};

// Cache management utilities
const getCacheSize = async (cacheName) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
};

const cleanupCache = async (cacheName, maxSize) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  // Get cache entries with timestamps
  const entries = [];
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const timestamp = response.headers.get('sw-cache-timestamp') || '0';
      const blob = await response.blob();
      entries.push({
        key,
        timestamp: parseInt(timestamp),
        size: blob.size
      });
    }
  }
  
  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  let currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const maxSizeBytes = maxSize * 1024 * 1024; // Convert MB to bytes
  
  // Remove oldest entries until under size limit
  for (const entry of entries) {
    if (currentSize <= maxSizeBytes) break;
    
    await cache.delete(entry.key);
    currentSize -= entry.size;
    console.log(`[SW] Removed cached item: ${entry.key.url}`);
  }
};

const isExpired = (response, maxAge) => {
  const timestamp = response.headers.get('sw-cache-timestamp');
  if (!timestamp) return true;
  
  return Date.now() - parseInt(timestamp) > maxAge;
};

// Enhanced caching strategies
const cacheFirst = async (request) => {
  const cacheName = getCacheNameForRequest(request);
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cached response is expired
    const maxAge = CACHE_EXPIRATION.static;
    if (!isExpired(cachedResponse, maxAge)) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response and add timestamp
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, modifiedResponse);
      
      // Cleanup cache if needed
      const cacheType = cacheName.includes('images') ? 'images' : 'static';
      const currentSize = await getCacheSize(cacheName);
      const maxSize = CACHE_LIMITS[cacheType] * 1024 * 1024;
      
      if (currentSize > maxSize) {
        cleanupCache(cacheName, CACHE_LIMITS[cacheType]);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] Network failed for ${request.url}, serving from cache`);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
};

const networkFirst = async (request) => {
  const cacheName = getCacheNameForRequest(request);
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] Network failed for ${request.url}, trying cache`);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if API cache is expired
      const maxAge = CACHE_EXPIRATION.api;
      if (!isExpired(cachedResponse, maxAge)) {
        return cachedResponse;
      }
    }
    
    return new Response('Offline', { status: 503 });
  }
};

const staleWhileRevalidate = async (request) => {
  const cacheName = getCacheNameForRequest(request);
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, modifiedResponse);
    }
    return response;
  }).catch(() => null);
  
  // Return cached response immediately if available
  return cachedResponse || networkResponsePromise;
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      
      try {
        await cache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached successfully');
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
        // Cache assets individually to avoid failing on single asset
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
          } catch (err) {
            console.warn(`[SW] Failed to cache ${asset}:`, err);
          }
        }
      }
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];
      
      await Promise.all(
        cacheNames.map(cacheName => {
          if (!validCaches.includes(cacheName)) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Take control of all clients
      self.clients.claim();
      
      console.log('[SW] Service worker activated');
    })()
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip requests with no-cache header
  if (request.headers.get('cache-control') === 'no-cache') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Choose strategy based on request type
        if (isStaticAsset(url.pathname)) {
          return await cacheFirst(request);
        }
        
        if (isApiRequest(url.pathname)) {
          return await networkFirst(request);
        }
        
        // For navigation requests and dynamic content
        if (request.mode === 'navigate' || request.destination === 'document') {
          return await staleWhileRevalidate(request);
        }
        
        // Default to network first for other requests
        return await networkFirst(request);
        
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          const cache = await caches.open(STATIC_CACHE);
          return await cache.match('/') || new Response('Offline', { status: 503 });
        }
        
        return new Response('Service Unavailable', { status: 503 });
      }
    })()
  );
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_SIZE':
      (async () => {
        const sizes = {};
        const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];
        
        for (const cacheName of cacheNames) {
          sizes[cacheName] = await getCacheSize(cacheName);
        }
        
        event.ports[0].postMessage({ type: 'CACHE_SIZE', payload: sizes });
      })();
      break;
      
    case 'CLEAR_CACHE':
      (async () => {
        const { cacheName } = payload;
        if (cacheName) {
          await caches.delete(cacheName);
        } else {
          // Clear all caches
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      })();
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

console.log('[SW] Enhanced service worker script loaded');