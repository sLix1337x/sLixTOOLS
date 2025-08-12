import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { FileImage, Download, Settings, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { validateImageFile } from '@/utils/fileValidation';
import AnimatedElement from '@/components/AnimatedElement';
import ParticleBackground from '@/components/ParticleBackground';

interface ConversionOptions {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

const ImageConverter: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [convertedImage, setConvertedImage] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    format: 'jpeg',
    quality: 90,
    maintainAspectRatio: true
  });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [convertedUrl, setConvertedUrl] = useState<string>('');
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid image file');
      return;
    }

    setImageFile(file);
    setConvertedImage(null);
    setConvertedUrl('');
    
    // Create preview URL and get dimensions
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    
    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      setOptions(prev => ({
        ...prev,
        width: img.width,
        height: img.height
      }));
    };
    img.src = url;
    
    toast.success('Image file loaded successfully!');
  }, [imageUrl]);

  const convertImage = useCallback(async (file: File, options: ConversionOptions): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Set canvas dimensions
          canvas.width = options.width || img.width;
          canvas.height = options.height || img.height;
          
          // Draw image on canvas
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to desired format
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert image'));
              }
            },
            `image/${options.format}`,
            options.format === 'jpeg' ? options.quality / 100 : undefined
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      toast.error('Please select an image file first');
      return;
    }

    setIsConverting(true);

    try {
      const result = await convertImage(imageFile, options);
      setConvertedImage(result);
      
      // Create download URL
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
      const url = URL.createObjectURL(result);
      setConvertedUrl(url);
      
      toast.success('Image converted successfully!');
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert image. Please try again.');
    } finally {
      setIsConverting(false);
    }
  }, [imageFile, options, convertedUrl, convertImage]);

  const handleDownload = useCallback(() => {
    if (!convertedImage || !imageFile) return;

    const link = document.createElement('a');
    link.href = convertedUrl;
    link.download = `${imageFile.name.split('.')[0]}_converted.${options.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started!');
  }, [convertedImage, convertedUrl, imageFile, options.format]);

  const handleDimensionChange = useCallback((dimension: 'width' | 'height', value: number) => {
    if (!originalDimensions) return;
    
    setOptions(prev => {
      const newOptions = { ...prev };
      
      if (prev.maintainAspectRatio) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;
        
        if (dimension === 'width') {
          newOptions.width = value;
          newOptions.height = Math.round(value / aspectRatio);
        } else {
          newOptions.height = value;
          newOptions.width = Math.round(value * aspectRatio);
        }
      } else {
        newOptions[dimension] = value;
      }
      
      return newOptions;
    });
  }, [originalDimensions]);

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    };
  }, [imageUrl, convertedUrl]);

  return (
    <div className="text-white relative min-h-screen">
      <ParticleBackground />
      <Helmet>
        <title>Image Converter - sLixTOOLS</title>
        <meta name="description" content="Convert images between different formats like JPEG, PNG, WebP, and more with customizable quality settings." />
        <link rel="canonical" href="https://slixtools.io/tools/image-converter" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Image Converter
              </h1>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Convert your images between different formats with customizable quality and size settings.
                All processing happens in your browser for maximum privacy.
              </p>
            </div>
          </AnimatedElement>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <AnimatedElement type="slideUp" delay={0.4}>
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileImage className="h-5 w-5" />
                    Upload Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-300 mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">Supports JPEG, PNG, WebP, GIF, BMP, and more</p>
                    </label>
                  </div>
                  
                  {imageFile && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <strong>File:</strong> {imageFile.name}
                      </p>
                      <p className="text-sm text-gray-300">
                        <strong>Size:</strong> {(imageFile.size / 1024).toFixed(2)} KB
                      </p>
                      {originalDimensions && (
                        <p className="text-sm text-gray-300">
                          <strong>Dimensions:</strong> {originalDimensions.width} × {originalDimensions.height}
                        </p>
                      )}
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full rounded-lg mt-4"
                          style={{ maxHeight: '200px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedElement>

            {/* Conversion Options */}
            <AnimatedElement type="slideUp" delay={0.6}>
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5" />
                    Conversion Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Output Format</Label>
                    <Select value={options.format} onValueChange={(value) => setOptions(prev => ({ ...prev, format: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                        <SelectItem value="bmp">BMP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {options.format === 'jpeg' && (
                    <div className="space-y-2">
                      <Label className="text-white">Quality: {options.quality}%</Label>
                      <Slider
                        value={[options.quality]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, quality: value }))}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}

                  {originalDimensions && (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="maintain-aspect"
                          checked={options.maintainAspectRatio}
                          onChange={(e) => setOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="maintain-aspect" className="text-white text-sm">
                          Maintain aspect ratio
                        </Label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white">Width</Label>
                          <input
                            type="number"
                            value={options.width || ''}
                            onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Height</Label>
                          <input
                            type="number"
                            value={options.height || ''}
                            onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                            min="1"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleConvert}
                    disabled={!imageFile || isConverting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isConverting ? 'Converting...' : 'Convert Image'}
                  </Button>
                </CardContent>
              </Card>
            </AnimatedElement>
          </div>

          {/* Result Section */}
          {convertedImage && (
            <AnimatedElement type="fadeIn" delay={0.8}>
              <Card className="bg-gray-800/50 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Download className="h-5 w-5" />
                    Converted Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-300 mb-2">
                        <strong>Original:</strong> {(imageFile!.size / 1024).toFixed(2)} KB
                      </p>
                      <p className="text-sm text-gray-300 mb-4">
                        <strong>Converted:</strong> {(convertedImage.size / 1024).toFixed(2)} KB
                      </p>
                      <p className="text-sm text-green-400">
                        Size change: {(((convertedImage.size - imageFile!.size) / imageFile!.size) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  {convertedUrl && (
                    <img
                      src={convertedUrl}
                      alt="Converted"
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                    />
                  )}
                </CardContent>
              </Card>
            </AnimatedElement>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageConverter;