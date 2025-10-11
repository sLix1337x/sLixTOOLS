// Application configuration using environment variables with validation

// Environment variable validation helper
const validateEnvVar = (value: string | undefined, defaultValue: string, type: 'string' | 'number' | 'boolean' = 'string') => {
  if (!value) return defaultValue;
  
  switch (type) {
    case 'number': {
      const num = parseInt(value);
      return isNaN(num) ? parseInt(defaultValue) : num;
    }
    case 'boolean': {
      return value.toLowerCase() === 'true';
    }
    default: {
      return value;
    }
  }
};

// Validate array environment variables
const validateArrayEnvVar = (value: string | undefined, defaultValue: string): string[] => {
  if (!value) return defaultValue.split(',');
  return value.split(',').filter(item => item.trim().length > 0);
};

export const config = {
  app: {
    name: validateEnvVar(import.meta.env.VITE_APP_NAME, 'sLixTOOLS', 'string') as string,
    description: validateEnvVar(import.meta.env.VITE_APP_DESCRIPTION, 'Free online tools', 'string') as string,
  },
  
  upload: {
    maxFileSize: validateEnvVar(import.meta.env.VITE_MAX_FILE_SIZE, '104857600', 'number') as number,
    allowedVideoTypes: validateArrayEnvVar(import.meta.env.VITE_ALLOWED_VIDEO_TYPES, 'video/mp4,video/webm,video/ogg'),
    allowedImageTypes: validateArrayEnvVar(import.meta.env.VITE_ALLOWED_IMAGE_TYPES, 'image/jpeg,image/png,image/gif,image/webp'),
  },
  
  gif: {
    defaultFps: validateEnvVar(import.meta.env.VITE_DEFAULT_FPS, '15', 'number') as number,
    defaultQuality: validateEnvVar(import.meta.env.VITE_DEFAULT_QUALITY, '80', 'number') as number,
    maxDuration: validateEnvVar(import.meta.env.VITE_MAX_GIF_DURATION, '30', 'number') as number,
    workerPath: validateEnvVar(import.meta.env.VITE_GIF_WORKER_PATH, `${import.meta.env.BASE_URL}workers/gif.worker.js`, 'string') as string,
  },
  
  features: {
    enable3DScene: validateEnvVar(import.meta.env.VITE_ENABLE_3D_SCENE, 'false', 'boolean') as boolean,
    enableAnalytics: validateEnvVar(import.meta.env.VITE_ENABLE_ANALYTICS, 'false', 'boolean') as boolean,
    enableDebugMode: validateEnvVar(import.meta.env.VITE_ENABLE_DEBUG_MODE, 'false', 'boolean') as boolean,
  },
} as const;
