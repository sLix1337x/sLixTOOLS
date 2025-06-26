import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Image, Download, Loader2, ImagePlus, SlidersHorizontal, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [resizedSize, setResizedSize] = useState({ width: 0, height: 0 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Please upload a valid image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    processImageFile(file);
  };

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

  const loadImageFromUrl = async () => {
    if (!imageUrl) return;
    
    try {
      setIsLoadingFromUrl(true);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to load image from URL');
      
      const blob = await response.blob();
      if (!blob.type.match('image/')) {
        throw new Error('The URL does not point to a valid image');
      }
      
      const file = new File([blob], 'image-from-url.jpg', { type: blob.type });
      processImageFile(file);
    } catch (error) {
      console.error('Error loading image from URL:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load image from URL');
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  const handleResize = () => {
    if (!imageFile) return;
    
    setIsResizing(true);
    
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setIsResizing(false);
        return;
      }
      
      canvas.width = resizedSize.width;
      canvas.height = resizedSize.height;
      
      // Draw image with new dimensions
      ctx.drawImage(img, 0, 0, resizedSize.width, resizedSize.height);
      
      // Convert to data URL
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setResizedImageUrl(resizedDataUrl);
      setIsResizing(false);
      
      // Clean up
      URL.revokeObjectURL(objectUrl);
    };
    
    img.src = objectUrl;
  };

  const handleDownload = () => {
    if (!resizedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = resizedImageUrl;
    link.download = `resized-${imageFile?.name || 'image'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>Image Resizer | sLixTOOLS</title>
        <meta name="description" content="Resize your images online for free. Adjust width and height while maintaining aspect ratio. Supports multiple image formats including JPG, PNG, GIF, WebP, and more." />
        <meta name="keywords" content="image resizer, resize images, image size reducer, online image editor, image tools" />
        <link rel="canonical" href="https://slixtools.io/tools/image-resizer" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Image Resizer
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Resize your images to any dimension. Supports JPG, PNG, GIF, WebP, and more.
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
                        or click to browse files (JPG, PNG, WebP, GIF, etc.)
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={SUPPORTED_IMAGE_TYPES.join(',')}
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
                    Enter a direct image URL (JPG, PNG, WebP, GIF, etc.)
                  </p>
                </div>
              </>
            ) : (
              <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Image className="h-10 w-10 text-cyan-400" />
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
                    <button
                      onClick={handleResize}
                      disabled={isResizing}
                      className="w-full bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center disabled:opacity-70"
                    >
                      {isResizing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Resizing...
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="mr-2 h-5 w-5" /> Resize Image
                        </>
                      )}
                    </button>
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
                            <button
                              onClick={handleDownload}
                              className="bg-[#2AD587] text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity"
                            >
                              <Download className="h-5 w-5" />
                              <span>Download</span>
                            </button>
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
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.8} className="mt-8">
            <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6">
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
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
};

export default ImageResizer;
