/**
 * Advanced image optimization utilities
 * Implements modern image optimization techniques for better performance
 */

import { PERFORMANCE_CONFIG } from '@/config/performance';

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: boolean;
  responsive?: boolean;
}

interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
  placeholder?: string;
}

// Image format support detection
class ImageFormatDetector {
  private static supportCache = new Map<string, boolean>();

  static async supportsFormat(format: string): Promise<boolean> {
    if (this.supportCache.has(format)) {
      return this.supportCache.get(format)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const supported = canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    this.supportCache.set(format, supported);
    
    return supported;
  }

  static async getBestFormat(): Promise<string> {
    // Check in order of preference: AVIF > WebP > JPEG
    if (await this.supportsFormat('avif')) return 'avif';
    if (await this.supportsFormat('webp')) return 'webp';
    return 'jpeg';
  }
}

// Advanced image loader with optimization
export class OptimizedImageLoader {
  private cache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private observer?: IntersectionObserver;

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              this.loadImage(src).then((loadedImg) => {
                img.src = loadedImg.src;
                img.classList.remove('lazy-loading');
                img.classList.add('lazy-loaded');
              });
              this.observer?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: PERFORMANCE_CONFIG.images.lazyLoadOffset + 'px',
        threshold: 0.1,
      }
    );
  }

  async loadImage(src: string): Promise<HTMLImageElement> {
    // Check cache first
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // Start loading
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.loadingPromises.set(src, loadPromise);
    return loadPromise;
  }

  observeLazyImage(img: HTMLImageElement) {
    if (this.observer) {
      img.classList.add('lazy-loading');
      this.observer.observe(img);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Image optimization utilities
export class ImageOptimizer {
  private static canvas?: HTMLCanvasElement;
  private static ctx?: CanvasRenderingContext2D;

  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;
    }
    return { canvas: this.canvas, ctx: this.ctx! };
  }

  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
    const {
      quality = PERFORMANCE_CONFIG.images.quality,
      format = 'webp',
      width,
      height,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const { canvas, ctx } = this.getCanvas();
          
          // Calculate dimensions
          const targetWidth = width || img.width;
          const targetHeight = height || img.height;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Draw and optimize
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to optimize image'));
              }
            },
            `image/${format}`,
            quality / 100
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static generateResponsiveImageSet(
    baseSrc: string,
    options: ImageOptimizationOptions = {}
  ): ResponsiveImageSet {
    const sizes = PERFORMANCE_CONFIG.images.sizes;
    const format = options.format || 'webp';
    
    const srcSet = sizes
      .map((size) => `${this.generateOptimizedUrl(baseSrc, { ...options, width: size, format })} ${size}w`)
      .join(', ');
    
    const sizesAttr = sizes
      .map((size, index) => {
        if (index === sizes.length - 1) return `${size}px`;
        return `(max-width: ${size}px) ${size}px`;
      })
      .join(', ');

    return {
      src: this.generateOptimizedUrl(baseSrc, options),
      srcSet,
      sizes: sizesAttr,
      placeholder: options.placeholder ? this.generatePlaceholder(baseSrc) : undefined,
    };
  }

  private static generateOptimizedUrl(
    src: string,
    options: ImageOptimizationOptions
  ): string {
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    
    return `${src}?${params.toString()}`;
  }

  private static generatePlaceholder(src: string): string {
    return this.generateOptimizedUrl(src, {
      width: 20,
      quality: PERFORMANCE_CONFIG.images.placeholderQuality,
      format: 'jpeg',
    });
  }
}

// Progressive image loading component
export class ProgressiveImageLoader {
  private static instances = new Set<ProgressiveImageLoader>();
  private img: HTMLImageElement;
  private placeholder?: HTMLImageElement;
  private container: HTMLElement;
  private loaded = false;

  constructor(container: HTMLElement, src: string, options: ImageOptimizationOptions = {}) {
    this.container = container;
    this.img = document.createElement('img');
    
    if (options.placeholder) {
      this.setupPlaceholder(src);
    }
    
    this.setupMainImage(src, options);
    ProgressiveImageLoader.instances.add(this);
  }

  private setupPlaceholder(src: string) {
    this.placeholder = document.createElement('img');
    this.placeholder.className = 'image-placeholder';
    this.placeholder.style.filter = 'blur(5px)';
    this.placeholder.style.transition = 'opacity 0.3s ease';
    
    const placeholderSrc = ImageOptimizer.generateOptimizedUrl(src, {
      width: 20,
      quality: 10,
      format: 'jpeg',
    });
    
    this.placeholder.src = placeholderSrc;
    this.container.appendChild(this.placeholder);
  }

  private async setupMainImage(src: string, options: ImageOptimizationOptions) {
    const bestFormat = await ImageFormatDetector.getBestFormat();
    const optimizedOptions = { ...options, format: bestFormat as 'webp' | 'avif' | 'jpeg' | 'png' };
    
    if (options.responsive) {
      const responsiveSet = ImageOptimizer.generateResponsiveImageSet(src, optimizedOptions);
      this.img.srcset = responsiveSet.srcSet;
      this.img.sizes = responsiveSet.sizes;
    }
    
    this.img.src = ImageOptimizer.generateOptimizedUrl(src, optimizedOptions);
    this.img.className = 'optimized-image';
    this.img.style.opacity = '0';
    this.img.style.transition = 'opacity 0.3s ease';
    
    this.img.onload = () => {
      this.loaded = true;
      this.img.style.opacity = '1';
      
      if (this.placeholder) {
        this.placeholder.style.opacity = '0';
        setTimeout(() => {
          if (this.placeholder?.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
          }
        }, 300);
      }
    };
    
    this.container.appendChild(this.img);
  }

  destroy() {
    if (this.img.parentNode) {
      this.img.parentNode.removeChild(this.img);
    }
    if (this.placeholder?.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }
    ProgressiveImageLoader.instances.delete(this);
  }

  static destroyAll() {
    this.instances.forEach(instance => instance.destroy());
    this.instances.clear();
  }
}

// Global image optimization manager
export const imageOptimizationManager = {
  loader: new OptimizedImageLoader(),
  
  async optimizeImage(file: File, options?: ImageOptimizationOptions): Promise<Blob> {
    return ImageOptimizer.optimizeImage(file, options);
  },
  
  createProgressiveLoader(
    container: HTMLElement,
    src: string,
    options?: ImageOptimizationOptions
  ): ProgressiveImageLoader {
    return new ProgressiveImageLoader(container, src, options);
  },
  
  generateResponsiveSet(src: string, options?: ImageOptimizationOptions): ResponsiveImageSet {
    return ImageOptimizer.generateResponsiveImageSet(src, options);
  },
  
  async getBestFormat(): Promise<string> {
    return ImageFormatDetector.getBestFormat();
  },
  
  cleanup() {
    this.loader.disconnect();
    ProgressiveImageLoader.destroyAll();
  },
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imageOptimizationManager.cleanup();
  });
}