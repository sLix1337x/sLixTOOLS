/**
 * Service Worker registration and management
 */

// Check if service workers are supported
const isSupported = 'serviceWorker' in navigator;

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isSupported) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Service Workers are not supported in this browser');
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker registered successfully:', registration);
    }

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify user
            console.log('New content is available; please refresh.');
            
            // Optionally show a notification to the user
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Update Available', {
                body: 'A new version of sLixTOOLS is available. Refresh to update.',
                icon: '/favicon.ico'
              });
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Service Worker registration failed:', error);
    }
    return null;
  }
};

// Unregister service worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

// Update service worker
export const updateServiceWorker = async (): Promise<void> => {
  if (!isSupported) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      if (process.env.NODE_ENV === 'development') {
        console.log('Service Worker update triggered');
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Service Worker update failed:', error);
    }
  }
};

// Send message to service worker
export const sendMessageToServiceWorker = (message: unknown): void => {
  if (!isSupported || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
};

// Listen for service worker messages
export const listenForServiceWorkerMessages = (callback: (event: MessageEvent) => void): (() => void) => {
  if (!isSupported) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('message', callback);
  
  return () => {
    navigator.serviceWorker.removeEventListener('message', callback);
  };
};

// Check if app is running in standalone mode (PWA)
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Notifications are not supported in this browser');
    }
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (process.env.NODE_ENV === 'development') {
      console.log('Notification permission:', permission);
    }
    return permission;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to request notification permission:', error);
    }
    return 'denied';
  }
};

// Performance monitoring integration
export const reportPerformanceToServiceWorker = (mark: string, value?: number): void => {
  sendMessageToServiceWorker({
    type: 'PERFORMANCE_MARK',
    mark,
    value,
    timestamp: Date.now()
  });
};

// Cache management
export const clearCaches = async (): Promise<void> => {
  if (!('caches' in window)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Cache API is not supported in this browser');
    }
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    if (process.env.NODE_ENV === 'development') {
      console.log('All caches cleared');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to clear caches:', error);
    }
  }
};

// Get cache usage
export const getCacheUsage = async (): Promise<{ used: number; quota: number } | null> => {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    console.warn('Storage API is not supported in this browser');
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  } catch (error) {
    console.error('Failed to get cache usage:', error);
    return null;
  }
};

// Initialize service worker with performance monitoring
export const initializeServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });
      
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Set up performance monitoring
      const cleanup = listenForServiceWorkerMessages((event) => {
        if (process.env.NODE_ENV === 'development') {
          if (event.data?.type === 'CACHE_HIT') {
            console.log('Cache hit:', event.data.url);
          } else if (event.data?.type === 'CACHE_MISS') {
            console.log('Cache miss:', event.data.url);
          }
        }
      });
      
      // Check for updates immediately and periodically
      const checkForUpdates = () => {
        registration.update().catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error(error);
          }
        });
      };
      
      // Check for updates every 30 minutes
      setInterval(checkForUpdates, 30 * 60 * 1000);
      
      // Check for updates on visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForUpdates();
        }
      });
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              if (process.env.NODE_ENV === 'development') {
                console.log('New content available, please refresh.');
              }
            }
          });
        }
      });

      // Request notification permission if not already granted
      await requestNotificationPermission();

      // Report initial performance mark
      reportPerformanceToServiceWorker('service-worker-initialized');

      // Return cleanup function
      return cleanup;
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
};