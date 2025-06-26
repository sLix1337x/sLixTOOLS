// This file imports the GIF worker script properly for Vite production builds
// Using ?worker suffix tells Vite to handle it as a web worker
import GifWorkerUrl from '../workers/gif.worker.js?worker';

// Export the worker URL for use in gif.js library
export const getGifWorkerUrl = () => {
  return GifWorkerUrl;
};
