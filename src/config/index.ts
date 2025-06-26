// Application configuration using environment variables

export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'sLixTOOLS',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Free online tools',
  },
  
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '104857600'),
    allowedVideoTypes: (import.meta.env.VITE_ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/ogg').split(','),
    allowedImageTypes: (import.meta.env.VITE_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  },
  
  gif: {
    defaultFps: parseInt(import.meta.env.VITE_DEFAULT_FPS || '15'),
    defaultQuality: parseInt(import.meta.env.VITE_DEFAULT_QUALITY || '80'),
    maxDuration: parseInt(import.meta.env.VITE_MAX_GIF_DURATION || '30'),
    workerPath: import.meta.env.VITE_GIF_WORKER_PATH || '/workers/gif.worker.js',
  },
  
  features: {
    enable3DScene: import.meta.env.VITE_ENABLE_3D_SCENE === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  },
} as const;
