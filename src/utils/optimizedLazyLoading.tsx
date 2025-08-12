import { lazy, ComponentType } from 'react';

// Enhanced lazy loading with preloading capabilities
interface LazyLoadOptions {
  preloadDelay?: number;
  preloadOnHover?: boolean;
  preloadOnViewport?: boolean;
  viewportMargin?: string;
}

// Cache for preloaded components
type PreloadedComponent = Promise<{ default: ComponentType<unknown> }>;
const preloadCache = new Map<string, PreloadedComponent>();

// Create optimized lazy component with preloading
export const createOptimizedLazy = <T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  options: LazyLoadOptions = {}
) => {
  const {
    preloadDelay = 2000,
    preloadOnHover = true,
    preloadOnViewport = false,
    viewportMargin = '100px'
  } = options;

  // Create the lazy component
  const LazyComponent = lazy(importFn);

  // Preload function
  const preload = () => {
    if (!preloadCache.has(componentName)) {
      preloadCache.set(componentName, importFn());
    }
    return preloadCache.get(componentName)!;
  };

  // Auto-preload after delay
  if (preloadDelay > 0) {
    setTimeout(preload, preloadDelay);
  }

  // Attach preload method to component
  (LazyComponent as ComponentType<unknown> & { preload: () => void; componentName: string }).preload = preload;
  (LazyComponent as ComponentType<unknown> & { preload: () => void; componentName: string }).componentName = componentName;

  return LazyComponent;
};

// Intersection Observer for viewport-based preloading
class ViewportPreloader {
  private observer: IntersectionObserver;
  private preloadTargets = new Map<Element, () => void>();

  constructor(margin = '100px') {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const preloadFn = this.preloadTargets.get(entry.target);
            if (preloadFn) {
              preloadFn();
              this.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin: margin }
    );
  }

  observe(element: Element, preloadFn: () => void) {
    this.preloadTargets.set(element, preloadFn);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    this.preloadTargets.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.preloadTargets.clear();
  }
}

// Global viewport preloader instance
let viewportPreloader: ViewportPreloader | null = null;

export const getViewportPreloader = (margin?: string) => {
  if (!viewportPreloader) {
    viewportPreloader = new ViewportPreloader(margin);
  }
  return viewportPreloader;
};

// Hook for hover-based preloading
export const useHoverPreload = (preloadFn: () => void, enabled = true) => {
  const handleMouseEnter = () => {
    if (enabled) {
      preloadFn();
    }
  };

  return { onMouseEnter: handleMouseEnter };
};

// Preload heavy libraries based on route patterns
export const preloadLibrariesByRoute = (pathname: string) => {
  const routeLibraryMap: Record<string, () => Promise<unknown>[]> = {
    'video-to-gif': () => [import('gif.js')],
    'gif-compressor': () => [import('gif.js')],
    'pdf-to-image': () => [import('pdfjs-dist')],
    'image-to-pdf': () => [import('jspdf')],
    'audio-downloader': () => [], // Audio processing handled by Web Audio API
  };

  Object.entries(routeLibraryMap).forEach(([route, getLibraries]) => {
    if (pathname.includes(route)) {
      getLibraries().forEach(libPromise => {
        libPromise.catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(error);
        }
      }); // Silent fail for optional dependencies
      });
    }
  });
};

// Performance-aware preloading based on connection speed
export const getPreloadStrategy = () => {
  // Check connection speed if available
  const connection = (navigator as Navigator & { connection?: { effectiveType: string; saveData: boolean } }).connection;
  
  if (connection) {
    const { effectiveType, saveData } = connection;
    
    // Disable preloading on slow connections or data saver mode
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return {
        enablePreload: false,
        preloadDelay: 0,
        maxConcurrentPreloads: 0
      };
    }
    
    // Adjust strategy based on connection speed
    if (effectiveType === '3g') {
      return {
        enablePreload: true,
        preloadDelay: 3000,
        maxConcurrentPreloads: 2
      };
    }
  }
  
  // Default strategy for fast connections
  return {
    enablePreload: true,
    preloadDelay: 1500,
    maxConcurrentPreloads: 4
  };
};

// Memory-aware cleanup
export const cleanupPreloadCache = () => {
  // Clear preload cache if memory usage is high
  if ('memory' in performance && (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory) {
    const { usedJSHeapSize, totalJSHeapSize } = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const memoryUsageRatio = usedJSHeapSize / totalJSHeapSize;
    
    if (memoryUsageRatio > 0.8) {
      preloadCache.clear();
      if (process.env.NODE_ENV === 'development') {
          console.log('Preload cache cleared due to high memory usage');
        }
    }
  }
};

// Initialize optimized loading system
export const initializeOptimizedLoading = () => {
  const strategy = getPreloadStrategy();
  
  // Set up periodic cache cleanup
  setInterval(cleanupPreloadCache, 30000); // Every 30 seconds
  
  // Listen for route changes to preload relevant libraries
  window.addEventListener('hashchange', () => {
    if (strategy.enablePreload) {
      preloadLibrariesByRoute(window.location.hash);
    }
  });
  
  // Initial preload based on current route
  if (strategy.enablePreload) {
    setTimeout(() => {
      preloadLibrariesByRoute(window.location.hash || window.location.pathname);
    }, strategy.preloadDelay);
  }
  
  return strategy;
};