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

    if (!file.type.match('image.*')) {
      toast.error('Please select a valid image file');
      return;
    }

    setImageFile(file);
    setCompressedUrl(null);
  };

  const compressImage = useCallback(() => {
    if (!imageFile) return;
    
    setIsCompressing(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (maintain aspect ratio)
        const maxDimension = 2000; // Max width/height
        let width = img.width;
        let height = img.height;
        
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
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed format
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        setCompressedUrl(compressedDataUrl);
        setIsCompressing(false);
      };
    };
    
    reader.readAsDataURL(imageFile);
  }, [imageFile, quality]);

  const loadImageFromUrl = async () => {
    if (!imageUrl) return;
    
    try {
      setIsLoadingFromUrl(true);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to load image from URL');
      
      const blob = await response.blob();
      if (!blob.type.match('image.*')) {
        throw new Error('The URL does not point to a valid image');
      }
      
      const file = new File([blob], 'image-from-url.jpg', { type: blob.type });
      setImageFile(file);
      setCompressedUrl(null);
      setActiveTab('upload');
    } catch (error) {
      console.error('Error loading image from URL:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load image from URL');
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

export default ImageCompressor;
