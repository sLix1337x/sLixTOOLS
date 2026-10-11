import { useState, useRef } from 'react';
import { Image, Download, SlidersHorizontal, X, ShieldCheck } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
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
  'image/avif'
];

const MAX_DIMENSION = 16384; // 16384² is also Chromium's max canvas area

const clampDimension = (value: number) =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.round(value) || 1));

const ImageResizer = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { isLoading: isResizing, executeWithLoading: executeResizing } = useLoading();
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [resizedSize, setResizedSize] = useState({ width: 0, height: 0 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bumped on every new file / reset so in-flight work for the previous file is ignored
  const fileGenRef = useRef(0);

  const processImageFile = (file: File) => {
    const gen = ++fileGenRef.current;
    setResizedImageUrl(null);
    const reader = new FileReader();
    reader.onerror = () => {
      if (gen === fileGenRef.current) toast.error('Failed to read the image file');
    };
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new window.Image();

      img.onload = () => {
        if (gen !== fileGenRef.current) return;
        setPreviewUrl(dataUrl);
        setOriginalSize({ width: img.width, height: img.height });
        setResizedSize({ width: clampDimension(img.width), height: clampDimension(img.height) });
        setImageFile(file);
      };
      img.onerror = () => {
        if (gen === fileGenRef.current) {
          toast.error('Could not open this image. Your browser may not support its format.');
        }
      };
      img.src = dataUrl;
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
    const gen = fileGenRef.current;

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

              canvas.width = clampDimension(resizedSize.width);
              canvas.height = clampDimension(resizedSize.height);

              // JPEG has no alpha: fill white so transparent pixels don't turn black
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // Draw image with new dimensions
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // Convert to data URL
              const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              URL.revokeObjectURL(objectUrl);
              // Oversized canvases yield "data:," instead of throwing
              if (!resizedDataUrl.startsWith('data:image/jpeg')) {
                reject(new Error(`Your browser could not create a ${canvas.width}×${canvas.height} image. Try smaller dimensions.`));
                return;
              }
              if (gen === fileGenRef.current) setResizedImageUrl(resizedDataUrl);
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
      `resized-${imageFile?.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`,
      { showToast: true }
    );
  };



  const handleWidthChange = (value: number) => {
    if (maintainAspectRatio && originalSize.width > 0) {
      const ratio = originalSize.height / originalSize.width;
      setResizedSize({
        width: clampDimension(value),
        height: clampDimension(clampDimension(value) * ratio)
      });
    } else {
      setResizedSize(prev => ({ ...prev, width: clampDimension(value) }));
    }
  };

  const handleHeightChange = (value: number) => {
    if (maintainAspectRatio && originalSize.height > 0) {
      const ratio = originalSize.width / originalSize.height;
      setResizedSize({
        width: clampDimension(clampDimension(value) * ratio),
        height: clampDimension(value)
      });
    } else {
      setResizedSize(prev => ({ ...prev, height: clampDimension(value) }));
    }
  };

  const resetImage = () => {
    fileGenRef.current++;
    setImageFile(null);
    setPreviewUrl(null);
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
      breadcrumbLabel="Image Resizer"
      faq={[
        {
          question: 'Will resizing affect image quality?',
          answer: 'Scaling down keeps images sharp because pixels are recalculated with interpolation. Upscaling beyond 2x can look soft.',
        },
        {
          question: 'Can I keep the aspect ratio?',
          answer: 'Yes — enable "Maintain aspect ratio" and the height adjusts automatically when you change the width, or vice versa.',
        },
        {
          question: 'Which formats are supported?',
          answer: 'JPG, PNG, WebP, GIF, BMP, AVIF and more. The resized image is exported as JPG.',
        },
        {
          question: 'Can I preview the image before resizing?',
          answer: 'Yes — a preview of your uploaded image appears right away, and after resizing you get a result preview you can download or open in a new tab.',
        },
      ]}
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

                {/* Preview window */}
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 flex items-center justify-center min-h-[12rem]">
                  <img
                    src={previewUrl ?? undefined}
                    alt="Preview of uploaded image"
                    className="max-h-64 max-w-full object-contain rounded-md"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="resize-width" className="text-sm font-medium text-gray-300">Width</label>
                      <div className="flex items-center space-x-2">
                        <input
                          id="resize-width"
                          type="number"
                          value={resizedSize.width}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-white text-sm text-center"
                          min="1"
                          max={MAX_DIMENSION}
                        />
                        <span className="text-sm text-gray-400">px</span>
                      </div>
                    </div>
                    <Slider
                      aria-label="Width"
                      value={[resizedSize.width]}
                      onValueChange={([value]) => handleWidthChange(value)}
                      min={1}
                      max={Math.min(MAX_DIMENSION, Math.max(originalSize.width * 2, 1000))}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="resize-height" className="text-sm font-medium text-gray-300">Height</label>
                      <div className="flex items-center space-x-2">
                        <input
                          id="resize-height"
                          type="number"
                          value={resizedSize.height}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-white text-sm text-center"
                          min="1"
                          max={MAX_DIMENSION}
                        />
                        <span className="text-sm text-gray-400">px</span>
                      </div>
                    </div>
                    <Slider
                      aria-label="Height"
                      value={[resizedSize.height]}
                      onValueChange={([value]) => handleHeightChange(value)}
                      min={1}
                      max={Math.min(MAX_DIMENSION, Math.max(originalSize.height * 2, 1000))}
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
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-sky-400 focus:ring-sky-400 focus:ring-offset-gray-900"
                    />
                    <label htmlFor="maintain-ratio" className="text-sm text-gray-300">
                      Maintain aspect ratio
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setResizedSize({
                          width: clampDimension(originalSize.width * 0.5),
                          height: clampDimension(originalSize.height * 0.5)
                        });
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => {
                        setResizedSize({
                          width: clampDimension(originalSize.width),
                          height: clampDimension(originalSize.height)
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
                    <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
                      <Image className="h-5 w-5 text-sky-400" aria-hidden="true" />
                      Resized Image
                    </h3>
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
                              // Browsers block top-level navigation to data: URLs; use a blob URL
                              const url = URL.createObjectURL(dataURItoBlob(resizedImageUrl));
                              const link = document.createElement('a');
                              link.href = url;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              link.click();
                              setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

          <Divider className="mt-8 mb-6" />
          <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
              <SlidersHorizontal className="mr-2 h-5 w-5 text-sky-400" />
              How to use
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Upload an image by clicking the area above or dragging and dropping</li>
              <li>Adjust the width and height sliders to your desired dimensions</li>
              <li>Toggle "Maintain aspect ratio" to keep proportions when resizing</li>
              <li>Click "Resize Image" to apply the changes</li>
              <li>Download your resized image</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500 flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sky-400/70" aria-hidden="true" />
              <span><span className="font-semibold">Note:</span> All processing happens in your browser. Your images are never uploaded to any server.</span>
            </p>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ImageResizer;
