
import GIF from 'gif.js';
import { ConversionOptions } from '@/types';
import { config } from '@/config';
import { getGifWorkerUrl } from './gifWorker';

export const convertVideoToGif = (
  videoFile: File,
  options: ConversionOptions = {}
): Promise<Blob> => {
  const {
    fps = 10,
    quality = 10,
    width,
    height,
    startTime = 0,
    duration,
    trimEnabled = false,
  } = options;

  return new Promise((resolve, reject) => {
    // Create video element to extract frames
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = false;
    
    // Create canvas to draw video frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    // Setup video metadata loading
    video.onloadedmetadata = () => {
      // Calculate actual start and end times
      const actualStartTime = trimEnabled ? Math.min(startTime, video.duration) : 0;
      const actualEndTime = trimEnabled && duration 
        ? Math.min(actualStartTime + duration, video.duration) 
        : video.duration;
      
      // Set canvas dimensions based on options or video dimensions
      const targetWidth = width || video.videoWidth;
      const targetHeight = height || video.videoHeight;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Create GIF encoder
      const gif = new GIF({
        workers: 2,
        quality,
        width: targetWidth,
        height: targetHeight,
        workerScript: getGifWorkerUrl(),
      });

      // When GIF is finished
      gif.on('finished', (blob) => {
        // Clean up
        video.pause();
        video.removeAttribute('src');
        video.load();
        
        resolve(blob);
      });

      gif.on('error', (error) => {
        reject(error);
      });
      
      // Capture frames
      const captureFrame = () => {
        if (video.currentTime < actualEndTime) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          gif.addFrame(ctx, { copy: true, delay: 1000 / fps });
          
          // Move to next frame
          video.currentTime += 1 / fps;
        } else {
          // Finish capturing
          gif.render();
        }
      };
      
      video.onseeked = captureFrame;
      
      // Start capturing from the start time
      video.currentTime = actualStartTime;
    };
    
    video.onerror = () => {
      reject(new Error('Error loading video'));
    };
    
    // Set video source
    video.src = URL.createObjectURL(videoFile);
  });
};
