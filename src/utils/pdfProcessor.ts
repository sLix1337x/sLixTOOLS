import { getPerformanceMonitor } from './performanceMonitor.tsx';

// Enhanced error handling for PDF processing
class PdfProcessingError extends Error {
  constructor(message: string, public stage: string, public originalError?: Error) {
    super(message);
    this.name = 'PdfProcessingError';
  }
}

interface PdfToImageOptions {
  scale: number; // 1.0 = 72 DPI, 2.0 = 144 DPI, etc.
  format: 'png' | 'jpeg';
  quality: number; // 0-100, only for JPEG
  pageRange?: { start: number; end: number };
  maxPages?: number;
}

interface ImageToPdfOptions {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'custom';
  orientation: 'portrait' | 'landscape';
  margin: number; // in mm
  quality: number; // 0-100
  customSize?: { width: number; height: number }; // in mm
  fitToPage: boolean;
}

interface ProcessingProgress {
  stage: 'loading' | 'processing' | 'rendering' | 'complete';
  progress: number;
  message: string;
  currentPage?: number;
  totalPages?: number;
  processedSize?: number;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// PDF.js loader with enhanced error handling
const loadPdfJs = async () => {
  try {
    const pdfjs = await import('pdfjs-dist');
    
    // Set worker source
    pdfjs.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.js';
    
    return pdfjs;
  } catch (error) {
    throw new PdfProcessingError('Failed to load PDF.js library', 'loading', error as Error);
  }
};

// jsPDF loader with enhanced error handling
const loadJsPdf = async () => {
  try {
    const jsPDF = await import('jspdf');
    return jsPDF;
  } catch (error) {
    throw new PdfProcessingError('Failed to load jsPDF library', 'loading', error as Error);
  }
};

// Memory-aware canvas operations for PDF rendering
class PdfCanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maxDimension = 4096; // Prevent memory issues

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', {
      alpha: false, // PDFs don't need alpha
      willReadFrequently: false,
      desynchronized: true
    });
    
    if (!ctx) {
      throw new PdfProcessingError('Failed to create canvas context', 'initialization');
    }
    
    this.ctx = ctx;
  }

  setupCanvas(viewport: { width: number; height: number }): { width: number; height: number } {
    const { width, height } = viewport;
    
    // Limit canvas size to prevent memory issues
    const scale = Math.min(1, this.maxDimension / Math.max(width, height));
    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);
    
    this.canvas.width = scaledWidth;
    this.canvas.height = scaledHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    
    return { width: scaledWidth, height: scaledHeight };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  toBlob(format: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new PdfProcessingError('Failed to create blob from canvas', 'rendering'));
          }
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality ? quality / 100 : undefined
      );
    });
  }

  cleanup() {
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.ctx.clearRect(0, 0, 1, 1);
  }
}

// Convert PDF to images with enhanced error handling and progress tracking
export const convertPdfToImages = async (
  pdfFile: File,
  options: PdfToImageOptions,
  onProgress?: ProgressCallback
): Promise<Blob[]> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('pdfProcessor');
  
  let canvasManager: PdfCanvasManager | null = null;
  
  try {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading PDF library...' });
    
    const pdfjs = await loadPdfJs();
    
    onProgress?.({ stage: 'loading', progress: 20, message: 'Loading PDF document...' });
    
    // Load PDF document
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    const totalPages = pdf.numPages;
    const maxPages = options.maxPages || 50; // Limit to prevent memory issues
    
    // Determine page range
    const startPage = options.pageRange?.start || 1;
    const endPage = Math.min(
      options.pageRange?.end || totalPages,
      totalPages,
      startPage + maxPages - 1
    );
    
    const pagesToProcess = endPage - startPage + 1;
    
    onProgress?.({ 
      stage: 'processing', 
      progress: 30, 
      message: `Processing ${pagesToProcess} pages...`,
      totalPages: pagesToProcess
    });
    
    const images: Blob[] = [];
    canvasManager = new PdfCanvasManager();
    
    // Process pages in batches to manage memory
    const batchSize = Math.min(3, Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)));
    
    for (let i = startPage; i <= endPage; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, endPage);
      const batchPromises: Promise<Blob>[] = [];
      
      for (let pageNum = i; pageNum <= batchEnd; pageNum++) {
        batchPromises.push(
          (async () => {
            try {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: options.scale });
              
              // Setup canvas for this page
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false
              })!;
              
              const { width, height } = viewport;
              tempCanvas.width = width;
              tempCanvas.height = height;
              
              // Render page
              await page.render({
                canvasContext: tempCtx,
                viewport: viewport
              }).promise;
              
              // Convert to blob
              const blob = await new Promise<Blob>((resolve, reject) => {
                tempCanvas.toBlob(
                  (blob) => {
                    if (blob) {
                      resolve(blob);
                    } else {
                      reject(new PdfProcessingError(`Failed to render page ${pageNum}`, 'rendering'));
                    }
                  },
                  options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
                  options.format === 'jpeg' ? options.quality / 100 : undefined
                );
              });
              
              // Cleanup
              tempCanvas.width = 0;
              tempCanvas.height = 0;
              
              const progress = 30 + ((pageNum - startPage + 1) / pagesToProcess) * 60;
              onProgress?.({ 
                stage: 'processing', 
                progress, 
                message: `Rendered page ${pageNum}/${endPage}`,
                currentPage: pageNum,
                totalPages: pagesToProcess
              });
              
              return blob;
              
            } catch (error) {
              console.error(`Failed to process page ${pageNum}:`, error);
              throw new PdfProcessingError(`Failed to process page ${pageNum}`, 'processing', error as Error);
            }
          })()
        );
      }
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      images.push(...batchResults);
      
      // Yield to main thread between batches
      if (batchEnd < endPage) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Force garbage collection if available
      if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
        try {
          (window as Window & { gc: () => void }).gc();
        } catch (e) {
          // Silent fail
        }
      }
    }
    
    onProgress?.({ 
      stage: 'complete', 
      progress: 100, 
      message: 'PDF conversion complete!',
      totalPages: images.length
    });
    
    monitor.trackMemoryUsage('pdfProcessor');
    return images;
    
  } catch (error) {
    console.error('PDF to images conversion failed:', error);
    
    if (error instanceof PdfProcessingError) {
      throw error;
    }
    
    throw new PdfProcessingError(
      `Unexpected error during PDF conversion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  } finally {
    canvasManager?.cleanup();
    endRender();
  }
};

// Convert images to PDF with enhanced error handling
export const convertImagesToPdf = async (
  imageFiles: File[],
  options: ImageToPdfOptions,
  onProgress?: ProgressCallback
): Promise<Blob> => {
  const monitor = getPerformanceMonitor();
  const endRender = monitor.startComponentRender('pdfProcessor');
  
  try {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading PDF library...' });
    
    const { jsPDF } = await loadJsPdf();
    
    onProgress?.({ stage: 'loading', progress: 20, message: 'Initializing PDF document...' });
    
    // Page size configurations (in mm)
    const pageSizes = {
      A4: { width: 210, height: 297 },
      Letter: { width: 216, height: 279 },
      Legal: { width: 216, height: 356 },
      A3: { width: 297, height: 420 },
      A5: { width: 148, height: 210 },
      custom: options.customSize || { width: 210, height: 297 }
    };
    
    const pageSize = pageSizes[options.pageSize];
    const { width: pageWidth, height: pageHeight } = options.orientation === 'landscape' 
      ? { width: pageSize.height, height: pageSize.width }
      : pageSize;
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.pageSize === 'custom' ? [pageWidth, pageHeight] : options.pageSize
    });
    
    const margin = options.margin;
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = pageHeight - (2 * margin);
    
    onProgress?.({ 
      stage: 'processing', 
      progress: 30, 
      message: 'Processing images...',
      totalPages: imageFiles.length
    });
    
    // Process images in batches to manage memory
    const batchSize = Math.min(5, Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)));
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const imageFile = batch[j];
        const imageIndex = i + j;
        
        try {
          // Load image
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new PdfProcessingError(`Failed to load image ${imageIndex + 1}`, 'loading'));
            img.src = URL.createObjectURL(imageFile);
          });
          
          // Calculate dimensions
          let imgWidth = img.width;
          let imgHeight = img.height;
          
          if (options.fitToPage) {
            // Scale to fit page while maintaining aspect ratio
            const scaleX = availableWidth / imgWidth;
            const scaleY = availableHeight / imgHeight;
            const scale = Math.min(scaleX, scaleY);
            
            imgWidth *= scale;
            imgHeight *= scale;
          } else {
            // Convert pixels to mm (assuming 96 DPI)
            const pixelsToMm = 25.4 / 96;
            imgWidth *= pixelsToMm;
            imgHeight *= pixelsToMm;
            
            // Ensure it fits on page
            if (imgWidth > availableWidth || imgHeight > availableHeight) {
              const scaleX = availableWidth / imgWidth;
              const scaleY = availableHeight / imgHeight;
              const scale = Math.min(scaleX, scaleY);
              
              imgWidth *= scale;
              imgHeight *= scale;
            }
          }
          
          // Center image on page
          const x = margin + (availableWidth - imgWidth) / 2;
          const y = margin + (availableHeight - imgHeight) / 2;
          
          // Add new page if not the first image
          if (imageIndex > 0) {
            pdf.addPage();
          }
          
          // Add image to PDF
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = canvas.toDataURL('image/jpeg', options.quality / 100);
          pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
          
          // Cleanup
          URL.revokeObjectURL(img.src);
          canvas.width = 0;
          canvas.height = 0;
          
          const progress = 30 + ((imageIndex + 1) / imageFiles.length) * 60;
          onProgress?.({ 
            stage: 'processing', 
            progress, 
            message: `Added image ${imageIndex + 1}/${imageFiles.length}`,
            currentPage: imageIndex + 1,
            totalPages: imageFiles.length
          });
          
        } catch (error) {
          console.error(`Failed to process image ${imageIndex + 1}:`, error);
          // Continue with next image instead of failing completely
        }
      }
      
      // Yield to main thread between batches
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    onProgress?.({ stage: 'rendering', progress: 90, message: 'Generating PDF...' });
    
    // Generate PDF blob
    const pdfBlob = pdf.output('blob');
    
    onProgress?.({ 
      stage: 'complete', 
      progress: 100, 
      message: 'PDF creation complete!',
      processedSize: pdfBlob.size
    });
    
    monitor.trackMemoryUsage('pdfProcessor');
    return pdfBlob;
    
  } catch (error) {
    console.error('Images to PDF conversion failed:', error);
    
    if (error instanceof PdfProcessingError) {
      throw error;
    }
    
    throw new PdfProcessingError(
      `Unexpected error during PDF creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      error instanceof Error ? error : undefined
    );
  } finally {
    endRender();
  }
};

// Utility function to get optimal PDF settings
export const getOptimalPdfSettings = (imageFiles: File[]): ImageToPdfOptions => {
  const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
  const sizeMB = totalSize / (1024 * 1024);
  
  // Adjust quality based on total size and number of images
  let quality = 85;
  if (sizeMB > 50 || imageFiles.length > 20) quality = 70;
  else if (sizeMB > 20 || imageFiles.length > 10) quality = 75;
  else if (sizeMB > 10 || imageFiles.length > 5) quality = 80;
  
  // Determine optimal page size based on image dimensions
  let pageSize: ImageToPdfOptions['pageSize'] = 'A4';
  let orientation: ImageToPdfOptions['orientation'] = 'portrait';
  
  if (imageFiles.length > 0) {
    // Analyze first few images to determine optimal layout
    const sampleSize = Math.min(3, imageFiles.length);
    const landscapeCount = 0;
    
    // This would require loading images, so we'll use a simple heuristic
    // In a real implementation, you might want to load a sample of images
    
    // Default to portrait A4 for most cases
    pageSize = 'A4';
    orientation = 'portrait';
  }
  
  return {
    pageSize,
    orientation,
    margin: 10, // 10mm margin
    quality,
    fitToPage: true
  };
};

// Export types and error class
export { 
  PdfProcessingError, 
  type PdfToImageOptions, 
  type ImageToPdfOptions, 
  type ProcessingProgress, 
  type ProgressCallback 
};