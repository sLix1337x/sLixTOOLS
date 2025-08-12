/**
 * Image Processing Worker
 * Handles image resizing, compression, and conversion in background thread
 */

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
  const { imageData, width, height, quality } = data;
  
  // Create canvas for resizing
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw and resize image
  const imageDataObj = new ImageData(imageData.data, imageData.width, imageData.height);
  ctx.putImageData(imageDataObj, 0, 0);
  
  // Get resized image data
  const resizedImageData = ctx.getImageData(0, 0, width, height);
  
  return {
    imageData: resizedImageData,
    width,
    height
  };
}

function compressImage(data) {
  const { imageData, quality, format } = data;
  
  // Image compression logic would go here
  // For now, return the original data
  return {
    compressedImageData: imageData,
    compressionRatio: 0.8
  };
}

function convertImage(data) {
  const { imageData, targetFormat } = data;
  
  // Image format conversion logic would go here
  // For now, return the original data
  return {
    convertedImageData: imageData,
    format: targetFormat
  };
}