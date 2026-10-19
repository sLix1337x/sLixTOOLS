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
type RouteComponent = React.ComponentType;

const routeMap: Record<string, { 
  loader: () => Promise<{ default: RouteComponent }>,
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
  '/tools/video-to-gif': { 
    loader: () => import('../pages/tools/VideoToGif'), 
    priority: 'medium',
    dependencies: ['ffmpeg-libs']
  },
  '/tools/gif-compressor': { 
    loader: () => import('../pages/tools/GifCompressor'), 
    priority: 'medium',
    dependencies: ['gif-libs']
  },
  '/tools/image-compressor': { 
    loader: () => import('../pages/tools/ImageCompressor'), 
    priority: 'high' 
  },
  '/tools/image-resizer': { 
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
      return Promise.resolve();
    }
    
    // Preload failures are non-fatal: the route loads on demand later
    return routeConfig.loader().then(() => undefined, () => undefined);
  }
  
  return Promise.resolve();
};

// Unused preloading functions removed for bundle optimization