/**
 * Performance optimization configuration
 * Centralized settings for all performance-related optimizations
 */

export const PERFORMANCE_CONFIG = {
  // Bundle optimization
  bundle: {
    chunkSizeLimit: 500, // KB
    preloadThreshold: 100, // KB
    criticalChunkSize: 250, // KB
    maxChunks: 20,
    compressionThreshold: 1024, // bytes
  },

  // Lazy loading
  lazyLoading: {
    intersectionMargin: '100px',
    preloadDelay: 2000, // ms
    hoverPreloadDelay: 200, // ms
    enableViewportPreload: true,
    enableHoverPreload: true,
  },

  // Image optimization
  images: {
    formats: ['webp', 'avif', 'jpg'],
    quality: 85,
    sizes: [320, 640, 960, 1280, 1920],
    lazyLoadOffset: 50, // px
    placeholderQuality: 10,
  },

  // Caching strategies
  cache: {
    staticAssets: '1y', // 1 year
    apiResponses: '5m', // 5 minutes
    images: '30d', // 30 days
    fonts: '1y',
    scripts: '1y',
  },

  // Performance monitoring
  monitoring: {
    enableInDev: true,
    enableInProd: false,
    longTaskThreshold: 50, // ms
    renderTimeThreshold: 16, // ms (60fps)
    memoryLeakThreshold: 50, // MB
    clsThreshold: 0.1,
  },

  // Service Worker
  serviceWorker: {
    enabled: true,
    cacheStrategy: 'networkFirst',
    offlinePages: ['/'],
    precacheAssets: true,
  },

  // Code splitting strategies
  codeSplitting: {
    routeLevel: true,
    componentLevel: true,
    vendorSeparation: true,
    dynamicImports: true,
  },

  // Resource hints
  resourceHints: {
    preconnect: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ],
    dnsPrefetch: [
      'https://api.example.com',
    ],
    preload: {
      fonts: true,
      criticalCSS: true,
      heroImages: true,
    },
  },

  // Critical rendering path
  critical: {
    inlineCSS: true,
    inlineCriticalJS: false,
    deferNonCritical: true,
    optimizeFonts: true,
  },

  // Memory management
  memory: {
    enableCleanup: true,
    cleanupInterval: 30000, // ms
    maxCacheSize: 100, // MB
    enableWeakRefs: true,
  },

  // Network optimization
  network: {
    enableCompression: true,
    enableHTTP2Push: false,
    enableBrotli: true,
    connectionTimeout: 10000, // ms
  },

  // Development optimizations
  development: {
    enableHMR: true,
    enableSourceMaps: true,
    enableDevtools: true,
    skipTypeChecking: false,
  },

  // Production optimizations
  production: {
    enableTreeShaking: true,
    enableMinification: true,
    enableCompression: true,
    enableSplitting: true,
    removeConsole: true,
    removeDebugger: true,
  },
};

// Feature flags for experimental optimizations
export const EXPERIMENTAL_FEATURES = {
  webAssembly: false,
  webWorkers: true,
  sharedArrayBuffer: false,
  offscreenCanvas: true,
  webStreams: true,
  importMaps: false,
};

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  lcp: 2500, // ms - Largest Contentful Paint
  fid: 100,  // ms - First Input Delay
  cls: 0.1,  // Cumulative Layout Shift
  
  // Additional metrics
  fcp: 1800, // ms - First Contentful Paint
  ttfb: 600, // ms - Time to First Byte
  tti: 3800, // ms - Time to Interactive
  
  // Bundle size budgets
  totalJS: 500,    // KB
  totalCSS: 100,   // KB
  totalImages: 1000, // KB
  totalFonts: 100,   // KB
  
  // Network budgets
  requests: 50,      // max requests
  domains: 5,        // max domains
};

// Tool-specific optimizations
export const TOOL_OPTIMIZATIONS = {
  'video-to-gif': {
    preloadLibraries: ['gif.js'],
    workerEnabled: true,
    memoryLimit: 512, // MB
    chunkProcessing: true,
  },
  'pdf-tools': {
    preloadLibraries: ['jspdf', 'pdfjs-dist'],
    workerEnabled: true,
    memoryLimit: 256, // MB
    streamProcessing: true,
  },
  'image-tools': {
    preloadLibraries: ['sharp'],
    workerEnabled: true,
    memoryLimit: 128, // MB
    canvasOptimization: true,
  },
  'audio-tools': {
    preloadLibraries: ['web-audio-api'],
    workerEnabled: true,
    memoryLimit: 64, // MB
    audioWorklet: true,
  },
};

// Get optimization config for specific tool
export const getToolOptimization = (toolName: string) => {
  return TOOL_OPTIMIZATIONS[toolName as keyof typeof TOOL_OPTIMIZATIONS] || {
    preloadLibraries: [],
    workerEnabled: false,
    memoryLimit: 64,
  };
};

// Check if feature is enabled
export const isFeatureEnabled = (feature: keyof typeof EXPERIMENTAL_FEATURES) => {
  return EXPERIMENTAL_FEATURES[feature] && 
         typeof window !== 'undefined' && 
         'serviceWorker' in navigator;
};

// Get performance config based on environment
export const getPerformanceConfig = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    ...PERFORMANCE_CONFIG,
    monitoring: {
      ...PERFORMANCE_CONFIG.monitoring,
      enableInDev: isDev && PERFORMANCE_CONFIG.monitoring.enableInDev,
      enableInProd: isProd && PERFORMANCE_CONFIG.monitoring.enableInProd,
    },
    development: isDev ? PERFORMANCE_CONFIG.development : {},
    production: isProd ? PERFORMANCE_CONFIG.production : {},
  };
};