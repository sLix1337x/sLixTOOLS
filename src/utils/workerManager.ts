/**
 * Advanced Web Worker management system
 * Handles heavy computations in background threads
 */

import { PERFORMANCE_CONFIG, TOOL_OPTIMIZATIONS } from '@/config/performance';

interface WorkerTask {
  id: string;
  type: string;
  data: unknown;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
}

interface WorkerResult {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

interface WorkerPool {
  workers: Worker[];
  available: boolean[];
  tasks: WorkerTask[];
  results: Map<string, { resolve: (value: WorkerResult) => void; reject: (reason?: unknown) => void }>;
}

// Worker script templates
const WORKER_SCRIPTS = {
  imageProcessor: `
    self.onmessage = function(e) {
      const { id, type, data } = e.data;
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (type) {
          case 'resize':
            result = resizeImage(data);
            break;
          case 'compress':
            result = compressImage(data);
            break;
          case 'convert':
            result = convertImage(data);
            break;
          default:
            throw new Error('Unknown task type: ' + type);
        }
        
        self.postMessage({
          id,
          success: true,
          data: result,
          duration: performance.now() - startTime
        });
      } catch (error) {
        self.postMessage({
          id,
          success: false,
          error: error.message,
          duration: performance.now() - startTime
        });
      }
    };
    
    function resizeImage(data) {
      // Image resizing logic
      const { imageData, width, height } = data;
      // Implementation would go here
      return { resizedImageData: imageData };
    }
    
    function compressImage(data) {
      // Image compression logic
      const { imageData, quality } = data;
      // Implementation would go here
      return { compressedImageData: imageData };
    }
    
    function convertImage(data) {
      // Image format conversion logic
      const { imageData, format } = data;
      // Implementation would go here
      return { convertedImageData: imageData };
    }
  `,
  
  gifProcessor: `
    importScripts('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
    
    self.onmessage = function(e) {
      const { id, type, data } = e.data;
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (type) {
          case 'create':
            result = createGif(data);
            break;
          case 'compress':
            result = compressGif(data);
            break;
          case 'optimize':
            result = optimizeGif(data);
            break;
          default:
            throw new Error('Unknown task type: ' + type);
        }
        
        self.postMessage({
          id,
          success: true,
          data: result,
          duration: performance.now() - startTime
        });
      } catch (error) {
        self.postMessage({
          id,
          success: false,
          error: error.message,
          duration: performance.now() - startTime
        });
      }
    };
    
    function createGif(data) {
      const { frames, options } = data;
      const gif = new GIF(options);
      
      frames.forEach(frame => {
        gif.addFrame(frame.canvas, { delay: frame.delay });
      });
      
      return new Promise((resolve) => {
        gif.on('finished', (blob) => {
          resolve({ gifBlob: blob });
        });
        gif.render();
      });
    }
    
    function compressGif(data) {
      // GIF compression logic
      return { compressedGif: data.gif };
    }
    
    function optimizeGif(data) {
      // GIF optimization logic
      return { optimizedGif: data.gif };
    }
  `,
  
  pdfProcessor: `
    importScripts('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    
    self.onmessage = function(e) {
      const { id, type, data } = e.data;
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (type) {
          case 'create':
            result = createPdf(data);
            break;
          case 'merge':
            result = mergePdfs(data);
            break;
          case 'extract':
            result = extractPages(data);
            break;
          default:
            throw new Error('Unknown task type: ' + type);
        }
        
        self.postMessage({
          id,
          success: true,
          data: result,
          duration: performance.now() - startTime
        });
      } catch (error) {
        self.postMessage({
          id,
          success: false,
          error: error.message,
          duration: performance.now() - startTime
        });
      }
    };
    
    function createPdf(data) {
      const { images, options } = data;
      const pdf = new jsPDF(options);
      
      images.forEach((image, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(image.data, image.format, 0, 0, image.width, image.height);
      });
      
      return { pdfBlob: pdf.output('blob') };
    }
    
    function mergePdfs(data) {
      // PDF merging logic
      return { mergedPdf: data.pdfs[0] };
    }
    
    function extractPages(data) {
      // PDF page extraction logic
      return { extractedPages: [] };
    }
  `
};

// Advanced Worker Manager
export class WorkerManager {
  private static instance: WorkerManager;
  private pools = new Map<string, WorkerPool>();
  private taskCounter = 0;
  private maxWorkers = navigator.hardwareConcurrency || 4;
  private defaultTimeout = 30000; // 30 seconds

  private constructor() {
    this.setupErrorHandling();
  }

  static getInstance(): WorkerManager {
    if (!this.instance) {
      this.instance = new WorkerManager();
    }
    return this.instance;
  }

  private setupErrorHandling() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.terminateAllWorkers();
      });
    }
  }

  private createWorkerPool(poolName: string, workerScript: string, poolSize?: number): WorkerPool {
    const size = poolSize || Math.min(this.maxWorkers, 4);
    const workers: Worker[] = [];
    const available: boolean[] = [];
    
    for (let i = 0; i < size; i++) {
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onerror = (error) => {
        console.error(`Worker error in pool ${poolName}:`, error);
      };
      
      workers.push(worker);
      available.push(true);
    }
    
    const pool: WorkerPool = {
      workers,
      available,
      tasks: [],
      results: new Map()
    };
    
    this.pools.set(poolName, pool);
    return pool;
  }

  private getOrCreatePool(poolName: string): WorkerPool {
    if (!this.pools.has(poolName)) {
      const script = WORKER_SCRIPTS[poolName as keyof typeof WORKER_SCRIPTS];
      if (!script) {
        throw new Error(`Unknown worker pool: ${poolName}`);
      }
      this.createWorkerPool(poolName, script);
    }
    return this.pools.get(poolName)!;
  }

  private getAvailableWorker(pool: WorkerPool): number {
    return pool.available.findIndex(available => available);
  }



  private executeTaskOnWorker(pool: WorkerPool, task: WorkerTask, workerIndex: number): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const worker = pool.workers[workerIndex];
      pool.available[workerIndex] = false;
      
      const timeout = task.timeout || this.defaultTimeout;
      const timeoutId: NodeJS.Timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);
      
      const cleanup = () => {
        pool.available[workerIndex] = true;
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        if (timeoutId) clearTimeout(timeoutId);
        
        // Process next task in queue
        this.processNextTask(pool);
      };
      
      const onMessage = (e: MessageEvent) => {
        const result: WorkerResult = e.data;
        cleanup();
        resolve(result);
      };
      
      const onError = (error: ErrorEvent) => {
        cleanup();
        reject(new Error(`Worker error: ${error.message}`));
      };
      
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      
      // Timeout is already set above
      
      // Send task to worker
      worker.postMessage(task);
    });
  }

  private processNextTask(pool: WorkerPool) {
    if (pool.tasks.length === 0) return;
    
    const workerIndex = this.getAvailableWorker(pool);
    if (workerIndex === -1) return;
    
    const task = pool.tasks.shift()!;
    const promiseHandlers = pool.results.get(task.id);
    
    if (promiseHandlers) {
      this.executeTaskOnWorker(pool, task, workerIndex)
        .then(result => {
          promiseHandlers.resolve(result);
          pool.results.delete(task.id);
        })
        .catch(error => {
          promiseHandlers.reject(error);
          pool.results.delete(task.id);
        });
    }
  }

  // Public API
  async executeTask(
    poolName: string,
    taskType: string,
    data: unknown,
    options: {
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<WorkerResult> {
    const pool = this.getOrCreatePool(poolName);
    const taskId = `task_${++this.taskCounter}`;
    
    const task: WorkerTask = {
      id: taskId,
      type: taskType,
      data,
      priority: options.priority || 'medium',
      timeout: options.timeout,
      retries: options.retries || 0
    };
    
    // Add task to queue
    pool.tasks.push(task);
    
    // Create promise for result
    const resultPromise = new Promise<WorkerResult>((resolve, reject) => {
      pool.results.set(taskId, { resolve, reject });
    });
    
    // Process queue
    this.processNextTask(pool);
    
    try {
      const result = await resultPromise;
      return result;
    } catch (error) {
      // Retry logic
      if (task.retries && task.retries > 0) {
        task.retries--;
        return this.executeTask(poolName, taskType, data, {
          ...options,
          retries: task.retries
        });
      }
      
      throw error;
    }
  }

  // Specialized methods for different tools
  async processImage(operation: string, data: unknown, options?: unknown): Promise<WorkerResult> {
    return this.executeTask('imageProcessor', operation, { ...data, ...options });
  }

  async processGif(operation: string, data: unknown, options?: unknown): Promise<WorkerResult> {
    return this.executeTask('gifProcessor', operation, { ...data, ...options });
  }

  async processPdf(operation: string, data: unknown, options?: unknown): Promise<WorkerResult> {
    return this.executeTask('pdfProcessor', operation, { ...data, ...options });
  }

  // Pool management
  getPoolStats(poolName: string) {
    const pool = this.pools.get(poolName);
    if (!pool) return null;
    
    return {
      totalWorkers: pool.workers.length,
      availableWorkers: pool.available.filter(a => a).length,
      queuedTasks: pool.tasks.length,
      activeTasks: pool.results.size
    };
  }

  getAllPoolStats() {
    const stats: Record<string, unknown> = {};
    this.pools.forEach((pool, name) => {
      stats[name] = this.getPoolStats(name);
    });
    return stats;
  }

  terminatePool(poolName: string) {
    const pool = this.pools.get(poolName);
    if (!pool) return;
    
    pool.workers.forEach(worker => worker.terminate());
    pool.tasks = [];
    pool.results.clear();
    this.pools.delete(poolName);
  }

  terminateAllWorkers() {
    this.pools.forEach((pool, name) => {
      this.terminatePool(name);
    });
  }

  // Preload workers for specific tools
  preloadWorkersForTool(toolName: string) {
    const optimization = TOOL_OPTIMIZATIONS[toolName as keyof typeof TOOL_OPTIMIZATIONS];
    if (!optimization?.workerEnabled) return;
    
    // Preload appropriate worker pools based on tool
    switch (toolName) {
      case 'video-to-gif':
      case 'gif-compressor':
        this.getOrCreatePool('gifProcessor');
        break;
      case 'image-compressor':
      case 'image-resizer':
      case 'image-converter':
        this.getOrCreatePool('imageProcessor');
        break;
      case 'image-to-pdf':
      case 'pdf-to-image':
        this.getOrCreatePool('pdfProcessor');
        break;
    }
  }
}

// React hook for worker management
export const useWorkerManager = () => {
  const workerManager = WorkerManager.getInstance();
  
  const executeTask = async (
    poolName: string,
    taskType: string,
    data: unknown,
    options?: unknown
  ) => {
    return workerManager.executeTask(poolName, taskType, data, options);
  };
  
  const processImage = async (operation: string, data: unknown, options?: unknown) => {
    return workerManager.processImage(operation, data, options);
  };
  
  const processGif = async (operation: string, data: unknown, options?: unknown) => {
    return workerManager.processGif(operation, data, options);
  };
  
  const processPdf = async (operation: string, data: unknown, options?: unknown) => {
    return workerManager.processPdf(operation, data, options);
  };
  
  const getStats = () => {
    return workerManager.getAllPoolStats();
  };
  
  return {
    executeTask,
    processImage,
    processGif,
    processPdf,
    getStats,
    preloadForTool: workerManager.preloadWorkersForTool.bind(workerManager),
    terminateAllWorkers: workerManager.terminateAllWorkers.bind(workerManager)
  };
};

// Global worker manager instance
export const workerManager = WorkerManager.getInstance();