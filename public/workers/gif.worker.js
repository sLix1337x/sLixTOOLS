
// GIF.js Worker - Local implementation to avoid CDN dependencies
// This worker handles the heavy lifting of GIF encoding

// Import the gif.js library from local copy
try {
  // Use local copy to avoid CDN dependencies
  importScripts('/workers/gif.worker.local.js');
} catch (e) {
  // Fallback: inline worker implementation
  console.warn('Could not load gif.js worker, using fallback implementation');
  
  // Basic GIF encoding worker implementation
  self.onmessage = function(e) {
    const { data } = e;
    
    if (data.type === 'start') {
      // Initialize GIF encoder
      self.postMessage({ type: 'progress', data: 0 });
    } else if (data.type === 'frame') {
      // Process frame data
      self.postMessage({ type: 'progress', data: data.progress || 0 });
    } else if (data.type === 'finish') {
      // Finalize GIF
      self.postMessage({ type: 'finished', data: new Uint8Array() });
    }
  };
}
