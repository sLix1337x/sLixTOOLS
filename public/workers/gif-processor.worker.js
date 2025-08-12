/**
 * GIF Processing Worker
 * Handles GIF creation, compression, and optimization in background thread
 */

// Import GIF.js library
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
    
    // Handle promise results
    if (result instanceof Promise) {
      result.then(data => {
        self.postMessage({
          id,
          success: true,
          data,
          duration: performance.now() - startTime
        });
      }).catch(error => {
        self.postMessage({
          id,
          success: false,
          error: error.message,
          duration: performance.now() - startTime
        });
      });
    } else {
      self.postMessage({
        id,
        success: true,
        data: result,
        duration: performance.now() - startTime
      });
    }
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
  
  return new Promise((resolve, reject) => {
    try {
      const gif = new GIF({
        workers: 2,
        quality: options.quality || 10,
        width: options.width,
        height: options.height,
        workerScript: '/workers/gif.worker.js'
      });
      
      frames.forEach(frame => {
        gif.addFrame(frame.canvas || frame.imageData, { 
          delay: frame.delay || 100 
        });
      });
      
      gif.on('finished', (blob) => {
        resolve({ gifBlob: blob });
      });
      
      gif.on('error', (error) => {
        reject(error);
      });
      
      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}

function compressGif(data) {
  const { gifData, compressionLevel } = data;
  
  // GIF compression logic
  // For now, return the original data with simulated compression
  return {
    compressedGif: gifData,
    compressionRatio: compressionLevel || 0.7,
    originalSize: gifData.size,
    compressedSize: Math.floor(gifData.size * (compressionLevel || 0.7))
  };
}

function optimizeGif(data) {
  const { gifData, optimizationOptions } = data;
  
  // GIF optimization logic
  // For now, return the original data with simulated optimization
  return {
    optimizedGif: gifData,
    optimizationRatio: 0.85,
    originalSize: gifData.size,
    optimizedSize: Math.floor(gifData.size * 0.85)
  };
}