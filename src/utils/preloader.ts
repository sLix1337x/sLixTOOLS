/**
 * Performance optimization utilities for preloading and resource hints
 */

// Extend Navigator interface for connection property
interface NavigatorConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection;
}

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

};

// Preload route components with priority and dependency awareness
export const preloadRoute = (routePath: string): Promise<void> => {

  const routeConfig = routeMap[routePath];
  if (routeConfig) {
    // Check if we should preload based on priority and connection
    const connection = (navigator as NavigatorWithConnection).connection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
    
    // Skip low priority routes on slow connections
    if (isSlowConnection && routeConfig.priority === 'low') {
      if (process.env.NODE_ENV === 'development') {
        // Route skipping logged to development system
      }
      return Promise.resolve();
    }
    
    return routeConfig.loader().then(() => {
      if (process.env.NODE_ENV === 'development') {
        // Route preloading logged to development system
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }).catch((_error) => {
      if (process.env.NODE_ENV === 'development') {
        // Route preloading errors logged to development system
      }
    });
  }
  
  return Promise.resolve();
};

// Unused preloading functions removed for bundle optimization