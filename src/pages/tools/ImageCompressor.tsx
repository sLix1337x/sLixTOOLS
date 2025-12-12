import React, { useState, useEffect, useCallback } from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import AnimatedElement from '@/components/AnimatedElement';
import errorLogger, { ErrorCategory } from '@/utils/errorLogger';
import ErrorBoundary from '@/components/ErrorBoundary';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import { config } from '@/config';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { useUrlFileLoader } from '@/hooks';
import { downloadBlob } from '@/utils/download';
import { dataURItoBlob } from '@/utils/dataConversion';
import ToolActionButton from '@/components/tools/ToolActionButton';

interface ImagePreviewProps {
  file: File | null;
  compressedUrl: string | null;
  quality: number;
  onQualityChange: (value: number) => void;
  onDownload: () => void;
  isCompressing: boolean;
}

const ImagePreview = ({
  file,
  compressedUrl,
  quality,
  onQualityChange,
  onDownload,
  isCompressing
}: ImagePreviewProps) => {
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
        <ToolActionButton
          icon={Download}
          onClick={onDownload}
          disabled={!compressedUrl || isCompressing}
        >
          Download Compressed
        </ToolActionButton>
      </div>
    </div>
  );
};

const ImageCompressor = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(70);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const handleFileSelected = (file: File) => {
    try {
      setImageFile(file);
      setCompressedUrl(null);
      toast.success('Image loaded successfully!');
    } catch (error) {
      errorLogger.logFileProcessingError(
        error as Error,
        file,
        'Failed to process selected file',
        'handleFileSelected'
      );
      toast.error('Failed to load image. Please try again.');
    }
  };

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: 50 * 1024 * 1024,
    onSuccess: (loadedFile) => {
      setImageFile(loadedFile);
      setCompressedUrl(null);
    },
    onError: (error) => {
      errorLogger.logFileProcessingError(
        error,
        new File([], 'url-load-error'),
        'Failed to load image from URL',
        'url_load',
        { url: 'redacted' }
      );
    }
  });

  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
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
          'compressImage_fileReader',
          { stage: 'fileReader' }
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
              'compressImage_imageLoad',
              { stage: 'imageLoad' }
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

              errorLogger.logError({
                message: 'Image compression completed successfully',
                category: ErrorCategory.FILE_PROCESSING,
                context: {
                  component: 'ImageCompressor',
                  action: 'compressImage',
                  userAgent: navigator.userAgent,
                  url: window.location.href
                },
                metadata: {
                  processingTime: `${processingTime.toFixed(2)}ms`,
                  originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
                  compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
                  compressionRatio: `${compressionRatio}%`,
                  quality: quality,
                  dimensions: `${width}x${height}`,
                  originalDimensions: `${img.width}x${img.height}`
                }
              });

            } catch (error) {
              errorLogger.logFileProcessingError(
                error as Error,
                imageFile,
                'Failed during canvas processing or compression',
                'compressImage_canvasProcessing',
                {
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
            'compressImage_imageInit',
            { stage: 'imageInit' }
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
        'compressImage_initialization',
        { stage: 'initialization' }
      );
      toast.error('Failed to start image compression. Please try again.');
      setIsCompressing(false);
    }
  }, [imageFile, quality]);

  const handleDownload = () => {
    if (!compressedUrl) return;

    downloadBlob(
      dataURItoBlob(compressedUrl),
      `compressed-${imageFile?.name || 'image'}.jpg`,
      { showToast: true }
    );
  };



  useEffect(() => {
    if (imageFile) {
      const timer = setTimeout(() => {
        compressImage();
      }, 300);

      return () => clearTimeout(timer);
    }
    // Return undefined for the case where imageFile is null
    return undefined;
  }, [imageFile, quality, compressImage]);

  return (
    <ToolPageLayout
      title="Image Compressor"
      description="Compress your images without losing quality. All processing happens in your browser."
      keywords="image compressor, compress images, reduce image size, image optimizer, online image compressor"
      canonicalUrl="https://slixtools.io/tools/image-compressor"
      pageTitle="Image Compressor | sLixTOOLS"
      pageDescription="Compress your images online for free. Reduce image file size while maintaining good quality. No upload required, all processing happens in your browser."
    >
      <div className="max-w-2xl mx-auto w-full">
        {!imageFile ? (
          <FileUploadArea
            onFileSelected={handleFileSelected}
            fileCategory="image"
            maxFileSize={config.upload.maxFileSize}
            acceptedTypes={['jpg', 'jpeg', 'png', 'webp', 'gif']}
            showUrlInput={true}
            onUrlSubmit={handleUrlSubmit}
            urlPlaceholder={EXTERNAL_URLS.PLACEHOLDERS.IMAGE}
          />
        ) : (
          <AnimatedElement type="fadeIn" delay={0.6}>
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
          </AnimatedElement>
        )}

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
    </ToolPageLayout>
  );
};

const ImageCompressorWithErrorBoundary = () => {
  return (
    <ErrorBoundary isFileProcessing={true} showDetailedError={true}>
      <ImageCompressor />
    </ErrorBoundary>
  );
};

export default ImageCompressorWithErrorBoundary;
