import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Image, Download, Loader2, ImagePlus, SlidersHorizontal, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';
import errorLogger, { ErrorCategory } from '@/utils/errorLogger';
import FileProcessingErrorBoundary from '@/components/FileProcessingErrorBoundary';

interface ImagePreviewProps {
  file: File | null;
  compressedUrl: string | null;
  quality: number;
  onQualityChange: (value: number) => void;
  onDownload: () => void;
  isCompressing: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  compressedUrl,
  quality,
  onQualityChange,
  onDownload,
  isCompressing
}) => {
  if (!file) return null;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Original</h3>
          <div className="relative aspect-square border-2 border-dashed border-gray-700 rounded-lg overflow-hidden">
            <img 
              src={URL.createObjectURL(file)} 
              alt="Original" 
              className="w-full h-full object-contain p-2"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {(file.size / 1024).toFixed(2)} KB
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-300">Compressed</h3>
            {compressedUrl && (
              <span className="text-xs text-gray-400">
                {Math.round((1 - (compressedUrl.length / (file.size / 0.75)) * quality) * 100)}% smaller
              </span>
            )}
          </div>
          <div className="relative aspect-square border-2 border-dashed border-green-500/30 rounded-lg overflow-hidden">
            {compressedUrl ? (
              <>
                <img 
                  src={compressedUrl} 
                  alt="Compressed" 
                  className="w-full h-full object-contain p-2"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {compressedUrl ? `${(compressedUrl.length / 1024).toFixed(2)} KB` : '0 KB'}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                {isCompressing ? 'Compressing...' : 'Preview will appear here'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="quality" className="text-sm font-medium text-gray-300">
            Quality: {quality}%
          </Label>
          <span className="text-xs text-gray-400">
            {quality > 80 ? 'Best' : quality > 50 ? 'Good' : 'Low'} quality
          </span>
        </div>
        <Slider
          id="quality"
          min={10}
          max={90}
          step={5}
          value={[quality]}
          onValueChange={(value) => onQualityChange(value[0])}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Smaller file</span>
          <span>Better quality</span>
        </div>
      </div>

      <div className="flex justify-center w-full">
        <button 
          onClick={onDownload}
          disabled={!compressedUrl || isCompressing}
          className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            outline: 'none',
            border: 'none',
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '200px'
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Download className="mr-2 h-5 w-5" />
          <span className="relative z-10">Download Compressed</span>
        </button>
      </div>
    </div>
  );
};

const ImageCompressor: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(70);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        errorLogger.logFileProcessingError(
          new Error('File too large'),
          file,
          'File size exceeds 50MB limit',
          'validation',
          { maxSize: '50MB', actualSize: `${(file.size / 1024 / 1024).toFixed(2)}MB` }
        );
        toast.error('File too large. Please select an image under 50MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        errorLogger.logFileProcessingError(
          new Error('Invalid file type'),
          file,
          'File is not a valid image format',
          'validation',
          { expectedType: 'image/*', actualType: file.type }
        );
        toast.error('Please select a valid image file.');
        return;
      }

      setImageFile(file);
      setCompressedUrl(null);
      toast.success('Image loaded successfully!');
    } catch (error) {
      errorLogger.logFileProcessingError(
        error as Error,
        file,
        'Failed to process selected file',
        'processing',
        { component: 'ImageCompressor', action: 'handleFileChange' }
      );
      toast.error('Failed to load image. Please try again.');
    }
  };

  const compressImage = useCallback(() => {
    if (!imageFile) return;
    
    setIsCompressing(true);
    const startTime = performance.now();
    
    try {
      const reader = new FileReader();
      
      reader.onerror = () => {
        const error = new Error('Failed to read image file');
        errorLogger.logFileProcessingError(
          error,
          imageFile,
          'FileReader failed to read image data',
          'processing',
          { component: 'ImageCompressor', action: 'compressImage', stage: 'fileReader' }
        );
        toast.error('Failed to read image file. Please try again.');
        setIsCompressing(false);
      };
      
      reader.onload = (event) => {
        try {
          const img = new window.Image();
          
          img.onerror = () => {
            const error = new Error('Failed to load image data');
            errorLogger.logFileProcessingError(
              error,
              imageFile,
              'Image element failed to load data',
              'processing',
              { component: 'ImageCompressor', action: 'compressImage', stage: 'imageLoad' }
            );
            toast.error('Failed to process image. The file may be corrupted.');
            setIsCompressing(false);
          };
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                throw new Error('Failed to get canvas 2D context');
              }
              
              // Calculate new dimensions (maintain aspect ratio)
              const maxDimension = 2000; // Max width/height
              let width = img.width;
              let height = img.height;
              
              // Validate image dimensions
              if (width <= 0 || height <= 0) {
                throw new Error('Invalid image dimensions');
              }
              
              if (width > height && width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Draw image with new dimensions
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to compressed format
              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
              
              if (!compressedDataUrl || compressedDataUrl === 'data:,') {
                throw new Error('Failed to generate compressed image data');
              }
              
              setCompressedUrl(compressedDataUrl);
              setIsCompressing(false);
              
              // Log successful compression
              const endTime = performance.now();
              const processingTime = endTime - startTime;
              const originalSize = imageFile.size;
              const compressedSize = Math.round(compressedDataUrl.length * 0.75); // Approximate size
              const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
              
              errorLogger.logError(
                new Error('Image compression completed successfully'),
                ErrorCategory.PERFORMANCE,
                'info',
                {
                  component: 'ImageCompressor',
                  action: 'compressImage',
                  processingTime: `${processingTime.toFixed(2)}ms`,
                  originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
                  compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
                  compressionRatio: `${compressionRatio}%`,
                  quality: quality,
                  dimensions: `${width}x${height}`,
                  originalDimensions: `${img.width}x${img.height}`
                },
                'Image compression performance metrics'
              );
              
            } catch (error) {
              errorLogger.logFileProcessingError(
                error as Error,
                imageFile,
                'Failed during canvas processing or compression',
                'processing',
                {
                  component: 'ImageCompressor',
                  action: 'compressImage',
                  stage: 'canvasProcessing',
                  quality: quality,
                  imageDimensions: `${img.width}x${img.height}`
                }
              );
              toast.error('Failed to compress image. Please try again.');
              setIsCompressing(false);
            }
          };
          
          img.src = event.target?.result as string;
          
        } catch (error) {
          errorLogger.logFileProcessingError(
            error as Error,
            imageFile,
            'Failed to initialize image processing',
            'processing',
            { component: 'ImageCompressor', action: 'compressImage', stage: 'imageInit' }
          );
          toast.error('Failed to process image. Please try again.');
          setIsCompressing(false);
        }
      };
      
      reader.readAsDataURL(imageFile);
      
    } catch (error) {
      errorLogger.logFileProcessingError(
        error as Error,
        imageFile,
        'Failed to start image compression',
        'processing',
        { component: 'ImageCompressor', action: 'compressImage', stage: 'initialization' }
      );
      toast.error('Failed to start image compression. Please try again.');
      setIsCompressing(false);
    }
  }, [imageFile, quality]);

  const loadImageFromUrl = async () => {
    if (!imageUrl) return;
    
    setIsLoadingFromUrl(true);
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        errorLogger.logError(
          error,
          ErrorCategory.NETWORK,
          'high',
          {
            url: imageUrl,
            status: response.status,
            statusText: response.statusText,
            component: 'ImageCompressor',
            action: 'loadImageFromUrl'
          },
          'Failed to fetch image from URL',
          [
            '1. Check if the URL is correct and accessible',
            '2. Ensure the URL points to a direct image file',
            '3. Try uploading the image file directly instead'
          ]
        );
        throw error;
      }
      
      const blob = await response.blob();
      
      if (!blob.type.startsWith('image/')) {
         const error = new Error('URL does not point to a valid image');
         errorLogger.logError(
           error,
           ErrorCategory.VALIDATION,
           'medium',
           {
             url: imageUrl,
             contentType: blob.type,
             component: 'ImageCompressor',
             action: 'loadImageFromUrl'
           },
           'URL content is not a valid image',
           [
             '1. Ensure the URL points to an image file (jpg, png, gif, webp)',
             '2. Check if the URL requires authentication',
             '3. Try downloading the image and uploading it directly'
           ]
         );
         throw error;
       }
      
      // Validate file size
      if (blob.size > 50 * 1024 * 1024) {
        const error = new Error('Image file too large');
        errorLogger.logFileProcessingError(
          error,
          new File([blob], 'image-from-url', { type: blob.type }),
          'Image from URL exceeds 50MB limit',
          'validation',
          { maxSize: '50MB', actualSize: `${(blob.size / 1024 / 1024).toFixed(2)}MB`, url: imageUrl }
        );
        throw error;
      }
      
      const file = new File([blob], 'image-from-url.jpg', { type: blob.type });
      setImageFile(file);
      setCompressedUrl(null);
      setActiveTab('upload');
    } catch (error) {
      console.error('Error loading image from URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load image from URL';
      toast.error(errorMessage, {
        action: {
          label: 'View Details',
          onClick: () => {
            const logs = errorLogger.getLogs().slice(-1)[0];
            if (logs) {
              console.group('🔍 Image Load Error Details');
              console.error('Error:', logs);
              console.groupEnd();
            }
          }
        }
      });
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  const handleDownload = () => {
    if (!compressedUrl) return;
    
    const link = document.createElement('a');
    link.href = compressedUrl;
    link.download = `compressed-${imageFile?.name || 'image'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (imageFile) {
      const timer = setTimeout(() => {
        compressImage();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [imageFile, quality, compressImage]);

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>Image Compressor | sLixTOOLS</title>
        <meta name="description" content="Compress your images online for free. Reduce image file size while maintaining good quality. No upload required, all processing happens in your browser." />
        <meta name="keywords" content="image compressor, compress images, reduce image size, image optimizer, online image compressor" />
        <link rel="canonical" href="https://slixtools.io/tools/image-compressor" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Image Compressor
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Compress your images without losing quality. All processing happens in your browser.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.6} className="space-y-6">
            {!imageFile ? (
              <>
                <div 
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-green-400/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-3 rounded-full bg-gray-800/50">
                      <ImagePlus className="h-8 w-8 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Drop your image here</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        or click to browse files (JPG, PNG, WEBP, GIF)
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                <div className="relative">
                  <div className="flex items-center mb-2">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="px-3 text-sm text-gray-400">or</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent"
                    />
                    <button
                      onClick={loadImageFromUrl}
                      disabled={!imageUrl || isLoadingFromUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2AD587] text-black font-medium py-1.5 px-4 rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingFromUrl ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : 'Load from URL'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Enter a direct image URL (JPG, PNG, WEBP, GIF)
                  </p>
                </div>
              </>
            ) : (
              <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
                <ImagePreview
                  file={imageFile}
                  compressedUrl={compressedUrl}
                  quality={quality}
                  onQualityChange={setQuality}
                  onDownload={handleDownload}
                  isCompressing={isCompressing}
                />
              </Card>
            )}
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.8} className="mt-8">
            <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
                <SlidersHorizontal className="mr-2 h-5 w-5 text-green-400" />
                How to use
              </h3>
              <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                <li>Upload an image by clicking the area above or dragging and dropping</li>
                <li>Adjust the quality slider to balance between size and quality</li>
                <li>Download your compressed image with the download button</li>
              </ol>
              <p className="mt-4 text-xs text-gray-500">
                <span className="font-semibold">Note:</span> All processing happens in your browser. Your images are never uploaded to any server.
              </p>
            </div>
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
};

const ImageCompressorWithErrorBoundary: React.FC = () => {
  return (
    <FileProcessingErrorBoundary>
      <ImageCompressor />
    </FileProcessingErrorBoundary>
  );
};

export default ImageCompressorWithErrorBoundary;
