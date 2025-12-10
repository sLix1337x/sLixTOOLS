import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FileImage, Settings, Download } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import { toast } from 'sonner';
import { useUrlFileLoader, useToolFile } from '@/hooks';
import { downloadBlob } from '@/utils/download';
import { dataURItoBlob } from '@/utils/dataConversion';
import { config } from '@/config';

interface ConversionOptions {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

const ImageConverter: React.FC = () => {
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    format: 'jpeg',
    quality: 85,
    width: 0,
    height: 0,
    maintainAspectRatio: true
  });

  // Use useToolFile hook for file handling
  const {
    file: imageFile,
    previewUrl: imageUrl,
    handleFileSelect
  } = useToolFile({
    acceptedTypes: ['image/*'],
    maxFileSize: config.upload.maxFileSize,
    onFileLoad: (file) => {
      setConvertedImage(null);

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
      img.src = URL.createObjectURL(file);
    }
  });

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: config.upload.maxFileSize,
    onSuccess: handleFileSelect
  });


  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
  };

  const convertImage = useCallback(async (file: File, options: ConversionOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          canvas.width = options.width || img.width;
          canvas.height = options.height || img.height;
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const mimeType = `image/${options.format}`;
          const quality = options.format === 'jpeg' ? options.quality / 100 : undefined;

          try {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            resolve(dataUrl);
          } catch (error) {
            reject(new Error(`Failed to convert image to ${options.format}: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      toast.error('Please select an image file first');
      return;
    }

    setIsConverting(true);
    setConvertedImage(null);

    try {
      const resultDataUrl = await convertImage(imageFile, options);
      setConvertedImage(resultDataUrl);
      toast.success('Image converted successfully!');
    } catch (error) {
      toast.error('Failed to convert image', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsConverting(false);
    }
  }, [imageFile, options, convertImage]);

  const handleDownload = useCallback(() => {
    if (!convertedImage || !imageFile) return;

    const filename = `${imageFile.name.split('.')[0]}_converted.${options.format}`;

    downloadBlob(
      dataURItoBlob(convertedImage),
      filename,
      { showToast: true }
    );
  }, [convertedImage, imageFile, options.format]);


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

  return (
    <ToolPageLayout
      title="Image Converter | sLixTOOLS"
      description="Convert your images between different formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
      keywords="image converter, jpeg to png, png to jpeg, webp converter, image format converter"
      canonicalUrl="/tools/image-converter"
      pageTitle="Image Converter"
      pageDescription="Convert your images between different formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileImage className="h-5 w-5" />
              Upload Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadArea
              onFileSelected={handleFileSelect}
              onUrlSubmit={handleUrlSubmit}
              acceptedTypes={['image/*']}
              maxFileSize={50 * 1024 * 1024}
              fileCategory="image"
              showUrlInput={true}
            />

            {imageFile && (
              <div className="space-y-2 mt-4">
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

        {/* Conversion Options */}
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
      </div>

      {/* Result Section */}
      {convertedImage && (
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
                  <strong>Format:</strong> {options.format.toUpperCase()}
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <img
              src={convertedImage}
              alt="Converted"
              className="w-full rounded-lg"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
            />
          </CardContent>
        </Card>
      )}
    </ToolPageLayout>
  );
};

export default ImageConverter;