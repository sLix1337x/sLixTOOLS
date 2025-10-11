// External library type definitions

// GIF.js library type definitions
declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    transparent?: string | null;
    background?: string;
    dither?: boolean | string;
    debug?: boolean;
    repeat?: number;
    workerScript?: string;
  }

  export interface GIFFrame {
    data: ImageData | HTMLCanvasElement | CanvasRenderingContext2D;
    delay?: number;
    copy?: boolean;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(frame: GIFFrame['data'], options?: { delay?: number; copy?: boolean }): void;
    render(): void;
    abort(): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'abort', callback: () => void): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
  }
}

// Performance API with memory extension
interface PerformanceMemory {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory;
}

// Make PerformanceWithMemory available globally
declare global {
  interface Window {
    performance: PerformanceWithMemory;
  }
}

// Note: Only active type definitions are included. 
// Commented-out types have been removed to keep the file clean.

export {};