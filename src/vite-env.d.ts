/// <reference types="vite/client" />

declare module 'vite-plugin-pwa' {
  import { Plugin } from 'vite';
  export interface VitePWAOptions {
    registerType?: 'autoUpdate' | 'prompt';
    includeAssets?: string[];
    manifest?: Record<string, any>;
    // Add other options as needed
  }
  export function VitePWA(options?: VitePWAOptions): Plugin;
}

declare module 'lenis' {
  export default class Lenis {
    constructor(options?: {
      duration?: number;
      easing?: (t: number) => number;
      orientation?: 'vertical' | 'horizontal';
      gestureOrientation?: 'vertical' | 'horizontal';
      smoothWheel?: boolean;
      wheelMultiplier?: number;
      touchMultiplier?: number;
      // Add other options as needed
    });
    raf(time: number): void;
    destroy(): void;
  }
}
