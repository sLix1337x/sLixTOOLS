// gif.worker.js - This will be a proper web worker
// This is the actual content that will be executed inside the worker environment
// The importScripts will work correctly inside a worker context

// Import the required dependencies for the GIF.js worker
self.importScripts('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
