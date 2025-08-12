/**
 * Performance optimization utilities for preloading and resource hints
 */

// Lazy route component map with priority levels
const routeMap: Record<string, { 
  loader: () => Promise<{ default: React.ComponentType<unknown> }>,
  priority: 'high' | 'medium' | 'low',
  dependencies?: string[]
}> = {
  '/tools': { 
    loader: () => import('../pages/Tools'), 
    priority: 'high' 
  },
  '/features': { 
    loader: () => import('../pages/Features'), 
    priority: 'medium' 
  },
  '/video-to-gif': { 
    loader: () => import('../pages/tools/VideoToGif'), 
    priority: 'medium',
    dependencies: ['ffmpeg-libs']
  },
  '/gif-compressor': { 
    loader: () => import('../pages/tools/GifCompressor'), 
    priority: 'medium',
    dependencies: ['gif-libs']
  },
  '/image-compressor': { 
    loader: () => import('../pages/tools/ImageCompressor'), 
    priority: 'high' 
  },
  '/image-resizer': { 
    loader: () => import('../pages/tools/ImageResizer'), 
    priority: 'high' 
  },
  '/image-to-pdf': { 
    loader: () => import('../pages/tools/ImageToPdf'), 
    priority: 'low',
    dependencies: ['pdf-libs']
  },
  '/pdf-to-image': { 
    loader: () => import('../pages/tools/PdfToImage'), 
    priority: 'low',
    dependencies: ['pdf-viewer']
  }
};

// Preload route components with priority and dependency awareness
export const preloadRoute = (routePath: string): Promise<void> => {

  const routeConfig = routeMap[routePath];
  if (routeConfig) {
    // Check if we should preload based on priority and connection
    const connection = (navigator as any).connection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
    
    // Skip low priority routes on slow connections
    if (isSlowConnection && routeConfig.priority === 'low') {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Skipping low priority route ${routePath} due to slow connection`);
      }
      return Promise.resolve();
    }
    
    return routeConfig.loader().then(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Preloaded route: ${routePath} (priority: ${routeConfig.priority})`);
      }
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to preload route ${routePath}:`, error);
      }
    });
  }
  
  return Promise.resolve();
};

// Preload critical chunks based on user navigation patterns
export const preloadChunk = (chunkName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = `/assets/js/${chunkName}`;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${chunkName}`));
    document.head.appendChild(link);
  });
};

// Tool component map with priority and dependency tracking
const toolComponentMap = {
  'video-to-gif': { 
    loader: () => import('../pages/tools/VideoToGif'),
    priority: 'medium',
    dependencies: ['ffmpeg-libs']
  },
  'gif-compressor': { 
    loader: () => import('../pages/tools/GifCompressor'),
    priority: 'medium',
    dependencies: ['gif-libs']
  },
  'image-compressor': { 
    loader: () => import('../pages/tools/ImageCompressor'),
    priority: 'high'
  },
  'image-resizer': { 
    loader: () => import('../pages/tools/ImageResizer'),
    priority: 'high'
  },
  'image-to-pdf': { 
    loader: () => import('../pages/tools/ImageToPdf'),
    priority: 'low',
    dependencies: ['pdf-libs']
  },
  'pdf-to-image': { 
    loader: () => import('../pages/tools/PdfToImage'),
    priority: 'low',
    dependencies: ['pdf-viewer']
  }
};

// Preload tool components with intelligent priority handling
export const preloadToolComponents = () => {
  return toolComponentMap;
};

// Smart tool preloader that respects connection and priority
export const preloadTool = (toolName: string): Promise<void> => {
  const toolConfig = toolComponentMap[toolName as keyof typeof toolComponentMap];
  if (!toolConfig) return Promise.resolve();
  
  // Check connection quality
  const connection = (navigator as any).connection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  const isLimitedData = connection && connection.saveData;
  
  // Skip low priority tools on constrained connections
  if ((isSlowConnection || isLimitedData) && toolConfig.priority === 'low') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Skipping low priority tool ${toolName} due to connection constraints`);
    }
    return Promise.resolve();
  }
  
  return toolConfig.loader().then(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Preloaded tool: ${toolName} (priority: ${toolConfig.priority})`);
    }
  }).catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Failed to preload tool ${toolName}:`, error);
    }
  });
};

// Intelligent preloading based on user interaction
export const setupIntelligentPreloading = () => {
  let preloadTimeout: NodeJS.Timeout;

  // Preload on hover with delay using smart preloader
  const handleToolHover = (toolName: string) => {
    preloadTimeout = setTimeout(() => {
      preloadTool(toolName);
    }, 200); // 200ms delay to avoid unnecessary preloads
  };

  // Cancel preload if user moves away quickly
  const handleToolLeave = () => {
    if (preloadTimeout) {
      clearTimeout(preloadTimeout);
    }
  };

  // Setup event listeners for tool navigation
  const setupToolPreloading = () => {
    const toolLinks = document.querySelectorAll('[data-tool-name]');
    
    toolLinks.forEach((link) => {
      const toolName = link.getAttribute('data-tool-name');
      if (toolName) {
        link.addEventListener('mouseenter', () => handleToolHover(toolName));
        link.addEventListener('mouseleave', handleToolLeave);
        link.addEventListener('touchstart', () => handleToolHover(toolName), { passive: true });
      }
    });
  };

  // Setup on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToolPreloading);
  } else {
    setupToolPreloading();
  }

  // Re-setup when new content is added (for SPA navigation)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        setupToolPreloading();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return () => {
    observer.disconnect();
    if (preloadTimeout) {
      clearTimeout(preloadTimeout);
    }
  };
};

import { getPreloadStrategy, preloadLibrariesByRoute } from './optimizedLazyLoading.tsx';

// Enhanced preloader with performance awareness
export const preloadHeavyLibraries = () => {
  const strategy = getPreloadStrategy();
  
  // Skip preloading if disabled by strategy
  if (!strategy.enablePreload) {
    if (process.env.NODE_ENV === 'development') {
        console.log('Preloading disabled due to connection constraints');
      }
    return;
  }
  
  const currentPath = window.location.hash || window.location.pathname;
  
  // Use optimized preloading with fallbacks
  const preloadWithFallback = async (importFn: () => Promise<{ default: unknown }>, name: string) => {
    try {
      await importFn();
      if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Preloaded ${name}`);
        }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Failed to preload ${name}:`, error);
        }
    }
  };
  
  // Preload based on current route with delay
  setTimeout(() => {
    // Preload gif.js for video-to-gif and gif-compressor pages
    if (currentPath.includes('video-to-gif') || currentPath.includes('gif-compressor')) {
      preloadWithFallback(() => import('gif.js'), 'gif.js');
    }
    
    // Preload jsPDF for image-to-pdf page
    if (currentPath.includes('image-to-pdf')) {
      preloadWithFallback(() => import('jspdf'), 'jsPDF');
    }
    
    // Preload PDF.js for pdf-to-image page
    if (currentPath.includes('pdf-to-image')) {
      preloadWithFallback(() => import('pdfjs-dist'), 'PDF.js');
    }
    
    // Use the optimized route-based preloading as well
    preloadLibrariesByRoute(currentPath);
  }, strategy.preloadDelay);
};

// Add resource hints to document head
export const addResourceHints = () => {
  const hints = [
    // DNS prefetch for external resources
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//cdn.jsdelivr.net' },
    
    // Preconnect to critical origins
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }
  ];

  hints.forEach(hint => {
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    if (hint.crossorigin) {
      link.crossOrigin = hint.crossorigin;
    }
    document.head.appendChild(link);
  });
};

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  const cleanupFunctions: (() => void)[] = [];
  
  // Add resource hints
  addResourceHints();
  
  // Setup intelligent preloading
  const cleanup = setupIntelligentPreloading();
  cleanupFunctions.push(cleanup);
  
  // Preload heavy libraries based on context
  preloadHeavyLibraries();
  
  // Listen for route changes to preload relevant libraries
  const handleRouteChange = () => {
    const strategy = getPreloadStrategy();
    if (strategy.enablePreload) {
      setTimeout(() => {
        preloadLibrariesByRoute(window.location.hash || window.location.pathname);
      }, 500); // Small delay to avoid blocking navigation
    }
  };
  
  window.addEventListener('hashchange', handleRouteChange);
  cleanupFunctions.push(() => {
    window.removeEventListener('hashchange', handleRouteChange);
  });
  
  // Memory cleanup interval
  const memoryCleanupInterval = setInterval(() => {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
      try {
        (window as Window & { gc: () => void }).gc();
      } catch (e) {
        // Silent fail - gc() is not always available
      }
    }
  }, 60000); // Every minute
  
  cleanupFunctions.push(() => {
    clearInterval(memoryCleanupInterval);
  });
  
  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};