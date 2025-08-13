/**
 * Simplified Web Worker management system
 * Basic worker handling for background computations
 */

interface WorkerTask {
  id: string;
  type: string;
  data: unknown;
}

interface WorkerResult {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

// Simple inline worker scripts
const WORKER_SCRIPTS = {
  imageProcessor: `
    self.onmessage = function(e) {
      const { id, type, data } = e.data;
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (type) {
          case 'resize':
            result = { resizedImageData: data.imageData };
            break;
          case 'compress':
            result = { compressedImageData: data.imageData };
            break;
          case 'convert':
            result = { convertedImageData: data.imageData };
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
  `,
  
  gifProcessor: `
    self.onmessage = function(e) {
      const { id, type, data } = e.data;
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (type) {
          case 'create':
            result = { gifBlob: new Blob() };
            break;
          case 'compress':
            result = { compressedGif: data.gif };
            break;
          case 'optimize':
            result = { optimizedGif: data.gif };
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
  `
};

export class WorkerManager {
  private static instance: WorkerManager;
  private workers = new Map<string, Worker>();
  private taskCounter = 0;
  private pendingTasks = new Map<string, { resolve: (value: WorkerResult) => void; reject: (reason?: unknown) => void }>();

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  private createWorker(workerType: string): Worker {
    const script = WORKER_SCRIPTS[workerType as keyof typeof WORKER_SCRIPTS];
    if (!script) {
      throw new Error(`Unknown worker type: ${workerType}`);
    }

    const blob = new Blob([script], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      const result: WorkerResult = e.data;
      const pending = this.pendingTasks.get(result.id);
      
      if (pending) {
        this.pendingTasks.delete(result.id);
        if (result.success) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(result.error));
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return worker;
  }

  private getWorker(workerType: string): Worker {
    if (!this.workers.has(workerType)) {
      this.workers.set(workerType, this.createWorker(workerType));
    }
    return this.workers.get(workerType)!;
  }

  async executeTask(workerType: string, taskType: string, data: unknown): Promise<WorkerResult> {
    const taskId = `task_${++this.taskCounter}`;
    const worker = this.getWorker(workerType);

    const task: WorkerTask = {
      id: taskId,
      type: taskType,
      data
    };

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingTasks.delete(taskId);
        reject(new Error('Task timeout'));
      }, 30000);

      // Clear timeout when task completes
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingTasks.set(taskId, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });

      worker.postMessage(task);
    });
  }

  // Convenience methods
  async processImage(operation: string, data: unknown): Promise<WorkerResult> {
    return this.executeTask('imageProcessor', operation, data);
  }

  async processGif(operation: string, data: unknown): Promise<WorkerResult> {
    return this.executeTask('gifProcessor', operation, data);
  }

  getStats() {
    return {
      activeWorkers: this.workers.size,
      pendingTasks: this.pendingTasks.size
    };
  }

  terminateWorker(workerType: string) {
    const worker = this.workers.get(workerType);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerType);
    }
  }

  terminateAllWorkers() {
    for (const [type, worker] of this.workers.entries()) {
      worker.terminate();
    }
    this.workers.clear();
    this.pendingTasks.clear();
  }
}

// Hook for React components
export const useWorkerManager = () => {
  const manager = WorkerManager.getInstance();
  
  return {
    executeTask: (workerType: string, taskType: string, data: unknown) => 
      manager.executeTask(workerType, taskType, data),
    processImage: (operation: string, data: unknown) => 
      manager.processImage(operation, data),
    processGif: (operation: string, data: unknown) => 
      manager.processGif(operation, data),
    getStats: () => manager.getStats(),
    terminateWorkers: () => manager.terminateAllWorkers()
  };
};

// Export singleton instance
export const workerManager = WorkerManager.getInstance();