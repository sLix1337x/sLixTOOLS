import React, { useState, useRef } from 'react';
import { Image, Download, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import { useLoading, useUrlFileLoader } from '@/hooks';
import { downloadBlob } from '@/utils/download';
import { config } from '@/config';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { dataURItoBlob } from '@/utils/dataConversion';
import ToolActionButton from '@/components/tools/ToolActionButton';

// Use centralized config for file size limits
const MAX_FILE_SIZE_BYTES = config.upload.maxFileSize;

const SUPPORTED_IMAGE_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/webp',
  'image/apng',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/mng',
  'image/jxl',
  'image/jxl'
];

const ImageResizer: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { isLoading: isResizing, executeWithLoading: executeResizing } = useLoading();
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [resizedSize, setResizedSize] = useState({ width: 0, height: 0 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height });
        setResizedSize({ width: img.width, height: img.height });
        setImageFile(file);
      };
    };
    reader.readAsDataURL(file);
  };

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: MAX_FILE_SIZE_BYTES,
    onSuccess: processImageFile
  });

  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
  };

  const handleResize = async () => {
    if (!imageFile) return;

    try {
      await executeResizing(async () => {
        return new Promise<void>((resolve, reject) => {
          const img = new window.Image();
          const objectUrl = URL.createObjectURL(imageFile);

          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              canvas.width = resizedSize.width;
              canvas.height = resizedSize.height;

              // Draw image with new dimensions
              ctx.drawImage(img, 0, 0, resizedSize.width, resizedSize.height);

              // Convert to data URL
              const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              setResizedImageUrl(resizedDataUrl);

              // Clean up
              URL.revokeObjectURL(objectUrl);
              resolve();
            } catch (error) {
              URL.revokeObjectURL(objectUrl);
              reject(error);
            }
          };

          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
          };

          img.src = objectUrl;
        });
      });
    } catch (error) {
      // Error details are logged to error reporting system
      toast.error(error instanceof Error ? error.message : 'Failed to resize image');
    }
  };

  const handleDownload = () => {
    if (!resizedImageUrl) return;

    downloadBlob(
      dataURItoBlob(resizedImageUrl),
      `resized-${imageFile?.name || 'image'}.jpg`,
      { showToast: true }
    );
  };



  const handleWidthChange = (value: number) => {
    if (maintainAspectRatio && originalSize.width > 0) {
      const ratio = originalSize.height / originalSize.width;
      setResizedSize({
        width: value,
        height: Math.round(value * ratio)
      });
    } else {
      setResizedSize(prev => ({ ...prev, width: value }));
    }
  };

  const handleHeightChange = (value: number) => {
    if (maintainAspectRatio && originalSize.height > 0) {
      const ratio = originalSize.width / originalSize.height;
      setResizedSize({
        width: Math.round(value * ratio),
        height: value
      });
    } else {
      setResizedSize(prev => ({ ...prev, height: value }));
    }
  };

  const resetImage = () => {
    setImageFile(null);
    setResizedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ToolPageLayout
      title="Image Resizer"
      description="Resize your images to any dimension. Supports JPG, PNG, GIF, WebP, and more."
      keywords="image resizer, resize images, image size reducer, online image editor, image tools"
      canonicalUrl="https://slixtools.io/tools/image-resizer"
      pageTitle="Image Resizer | sLixTOOLS"
      pageDescription="Resize your images online for free. Adjust width and height while maintaining aspect ratio. Supports multiple image formats including JPG, PNG, GIF, WebP, and more."
    >
      <div className="max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          {!imageFile ? (
            <>
              <FileUploadArea
                onFileSelected={processImageFile}
                acceptedTypes={SUPPORTED_IMAGE_TYPES}
                maxFileSize={MAX_FILE_SIZE_BYTES}
                title="Drop your image here"
                description="or click to browse files (JPG, PNG, WebP, GIF, etc.)"
                fileCategory="image"
                showUrlInput={true}
                onUrlSubmit={handleUrlSubmit}
                urlPlaceholder={EXTERNAL_URLS.PLACEHOLDERS.IMAGE}
              />
            </>
          ) : (
            <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Image className="h-10 w-10 text-blue-400" />
                    <div>
                      <p className="font-medium text-gray-200">{imageFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {originalSize.width} × {originalSize.height} px •
                        {(imageFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetImage}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Remove image"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Width</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={resizedSize.width}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-white text-sm text-center"
                          min="1"
                          max="10000"
                        />
                        <span className="text-sm text-gray-400">px</span>
                      </div>
                    </div>
                    <Slider
                      value={[resizedSize.width]}
                      onValueChange={([value]) => handleWidthChange(value)}
                      min={1}
                      max={Math.max(originalSize.width * 2, 1000)}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Height</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={resizedSize.height}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-white text-sm text-center"
                          min="1"
                          max="10000"
                        />
                        <span className="text-sm text-gray-400">px</span>
                      </div>
                    </div>
                    <Slider
                      value={[resizedSize.height]}
                      onValueChange={([value]) => handleHeightChange(value)}
                      min={1}
                      max={Math.max(originalSize.height * 2, 1000)}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintain-ratio"
                      checked={maintainAspectRatio}
                      onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400 focus:ring-offset-gray-900"
                    />
                    <label htmlFor="maintain-ratio" className="text-sm text-gray-300">
                      Maintain aspect ratio
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setResizedSize({
                          width: Math.round(originalSize.width * 0.5),
                          height: Math.round(originalSize.height * 0.5)
                        });
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => {
                        setResizedSize({
                          width: originalSize.width,
                          height: originalSize.height
                        });
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <ToolActionButton
                    icon={SlidersHorizontal}
                    onClick={handleResize}
                    disabled={isResizing}
                    isLoading={isResizing}
                    loadingText="Resizing..."
                    fullWidth
                  >
                    Resize Image
                  </ToolActionButton>
                </div>

                {resizedImageUrl && (
                  <div className="mt-8 pt-6 border-t border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Resized Image</h3>
                    <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <div className="aspect-square bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center">
                            <img
                              src={resizedImageUrl}
                              alt="Resized preview"
                              className="max-w-full max-h-64 object-contain"
                            />
                          </div>
                          <p className="mt-2 text-sm text-center text-gray-400">
                            {resizedSize.width} × {resizedSize.height} px
                          </p>
                        </div>
                        <div className="flex flex-col justify-center space-y-3">
                          <ToolActionButton
                            icon={Download}
                            onClick={handleDownload}
                          >
                            Download
                          </ToolActionButton>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = resizedImageUrl;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              link.click();
                            }}
                            className="bg-gray-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-600 transition-colors"
                          >
                            <Image className="h-5 w-5" />
                            <span>Open in new tab</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
              <SlidersHorizontal className="mr-2 h-5 w-5 text-green-400" />
              How to use
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Upload an image by clicking the area above or dragging and dropping</li>
              <li>Adjust the width and height sliders to your desired dimensions</li>
              <li>Toggle "Maintain aspect ratio" to keep proportions when resizing</li>
              <li>Click "Resize Image" to apply the changes</li>
              <li>Download your resized image</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              <span className="font-semibold">Note:</span> All processing happens in your browser. Your images are never uploaded to any server.
            </p>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ImageResizer;
