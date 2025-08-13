/**
 * Simplified performance configuration
 * Basic settings for performance optimizations
 */

// Basic performance configuration
export const PERFORMANCE_CONFIG = {
  // Basic monitoring
  monitoring: {
    enableInDev: true,
    enableInProd: false,
  },

  // Basic memory settings
  memory: {
    enableCleanup: true,
    cleanupInterval: 30000, // ms
    maxCacheSize: 100, // MB
  },

  // Basic cache settings
  cache: {
    defaultTTL: 60 * 60 * 1000, // 1 hour
    maxSize: 50,
  },

  // Development settings
  development: {
    enableHMR: true,
    enableSourceMaps: true,
  },

  // Production settings
  production: {
    enableMinification: true,
    enableCompression: true,
  },
};

// Basic tool optimizations
export const TOOL_OPTIMIZATIONS = {
  'video-to-gif': {
    workerEnabled: true,
    memoryLimit: 512, // MB
  },
  'image-tools': {
    workerEnabled: true,
    memoryLimit: 128, // MB
  },
  'audio-tools': {
    workerEnabled: true,
    memoryLimit: 64, // MB
  },
};

export const getToolOptimization = (toolName: string) => {
  return TOOL_OPTIMIZATIONS[toolName as keyof typeof TOOL_OPTIMIZATIONS] || {
    workerEnabled: false,
    memoryLimit: 64,
  };
};

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export const getPerformanceConfig = () => ({
  ...PERFORMANCE_CONFIG,
  monitoring: {
    ...PERFORMANCE_CONFIG.monitoring,
    enableInDev: isDev && PERFORMANCE_CONFIG.monitoring.enableInDev,
    enableInProd: isProd && PERFORMANCE_CONFIG.monitoring.enableInProd,
  },
  development: isDev ? PERFORMANCE_CONFIG.development : {},
  production: isProd ? PERFORMANCE_CONFIG.production : {},
});