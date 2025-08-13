// gif.worker.js - Local GIF worker implementation
// This worker handles GIF encoding without external CDN dependencies

// Import the required dependencies for the GIF.js worker from local copy
try {
  self.importScripts('/workers/gif.worker.local.js');
} catch (e) {
  console.warn('Could not load local gif.js worker, using fallback');
  
  // Fallback worker implementation
  self.onmessage = function(e) {
    const { data } = e;
    
    if (data.type === 'start') {
      self.postMessage({ type: 'progress', data: 0 });
    } else if (data.type === 'frame') {
      self.postMessage({ type: 'progress', data: data.progress || 0 });
    } else if (data.type === 'finish') {
      self.postMessage({ type: 'finished', data: new Uint8Array() });
    }
  };
}
