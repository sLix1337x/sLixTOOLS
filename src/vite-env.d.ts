/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_ALLOWED_VIDEO_TYPES: string;
  readonly VITE_ALLOWED_IMAGE_TYPES: string;
  readonly VITE_DEFAULT_FPS: string;
  readonly VITE_DEFAULT_QUALITY: string;
  readonly VITE_MAX_GIF_DURATION: string;
  readonly VITE_GIF_WORKER_PATH: string;
  readonly VITE_ENABLE_3D_SCENE: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_DEBUG_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global debug interface
declare global {
  interface Window {
    DEBUG?: boolean;
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}
