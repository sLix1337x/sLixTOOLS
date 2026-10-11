import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FileImage, Settings, Download } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
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

const MAX_DIMENSION = 16384; // 16384² is also Chromium's max canvas area

const clampDimension = (value: number) =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.round(value) || 1));

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

const ImageConverter = () => {
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  // Bumped on every new file so in-flight work for the previous file is ignored
  const fileGenRef = useRef(0);
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
      const gen = ++fileGenRef.current;
      setConvertedImage(null);

      // Get image dimensions
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (gen !== fileGenRef.current) return;
        setOriginalDimensions({ width: img.width, height: img.height });
        setOptions(prev => ({
          ...prev,
          width: img.width,
          height: img.height
        }));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        if (gen === fileGenRef.current) toast.error('Could not read this image. Your browser may not support its format.');
      };
      img.src = objectUrl;
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
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          canvas.width = clampDimension(options.width || img.width);
          canvas.height = clampDimension(options.height || img.height);
          const mimeType = `image/${options.format}`;
          if (ctx && mimeType === 'image/jpeg') {
            // JPEG has no alpha: fill white so transparent pixels don't turn black
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const quality = options.format === 'jpeg' ? options.quality / 100 : undefined;

          try {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            // Unsupported formats silently fall back to PNG; oversized canvases yield "data:,"
            if (!dataUrl.startsWith(`data:${mimeType}`)) {
              reject(new Error(`Your browser could not encode a ${canvas.width}×${canvas.height} ${options.format.toUpperCase()} image`));
              return;
            }
            resolve(dataUrl);
          } catch (error) {
            reject(new Error(`Failed to convert image to ${options.format}: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for conversion'));
      };
      img.src = objectUrl;
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      toast.error('Please select an image file first');
      return;
    }

    const gen = fileGenRef.current;
    setIsConverting(true);
    setConvertedImage(null);

    try {
      const resultDataUrl = await convertImage(imageFile, options);
      if (gen !== fileGenRef.current) return;
      setConvertedImage(resultDataUrl);
      toast.success('Image converted successfully!');
    } catch (error) {
      if (gen !== fileGenRef.current) return;
      toast.error('Failed to convert image', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsConverting(false);
    }
  }, [imageFile, options, convertImage]);

  // Format of the actual result (not the current dropdown selection)
  const resultFormat = convertedImage?.match(/^data:image\/([\w.+-]+)/)?.[1] ?? options.format;

  const handleDownload = useCallback(() => {
    if (!convertedImage || !imageFile) return;

    const filename = `${baseName(imageFile.name)}_converted.${resultFormat}`;

    downloadBlob(
      dataURItoBlob(convertedImage),
      filename,
      { showToast: true }
    );
  }, [convertedImage, imageFile, resultFormat]);

  // ---- Combined with the Image Compressor: compress the converted result ----
  const [compressQuality, setCompressQuality] = useState(70);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<HTMLImageElement | null>(null);
  const isLossyFormat = resultFormat === 'jpeg' || resultFormat === 'webp';

  // Decode the converted result once so quality changes only re-encode
  useEffect(() => {
    setDecodedResult(null);
    setCompressedUrl(null);
    if (!convertedImage) return;
    const img = new window.Image();
    img.onload = () => setDecodedResult(img);
    img.onerror = () => setDecodedResult(null);
    img.src = convertedImage;
  }, [convertedImage]);

  // Live compressed preview, debounced while the slider moves
  useEffect(() => {
    if (!convertedImage || !decodedResult) return;
    if (!isLossyFormat) {
      setCompressedUrl(null);
      return;
    }
    const timer = window.setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = decodedResult.naturalWidth;
      canvas.height = decodedResult.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(decodedResult, 0, 0);
      try {
        setCompressedUrl(
          canvas.toDataURL(`image/${resultFormat}`, compressQuality / 100)
        );
      } catch {
        setCompressedUrl(null);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [convertedImage, decodedResult, compressQuality, resultFormat, isLossyFormat]);

  const convertedSize = useMemo(
    () => (convertedImage ? dataURItoBlob(convertedImage).size : 0),
    [convertedImage]
  );
  const compressedSize = useMemo(
    () => (compressedUrl ? dataURItoBlob(compressedUrl).size : 0),
    [compressedUrl]
  );
  const sizeSaved =
    convertedSize > 0 && compressedSize < convertedSize
      ? Math.round((1 - compressedSize / convertedSize) * 100)
      : 0;

  const handleDownloadCompressed = () => {
    if (!compressedUrl || !imageFile) return;
    downloadBlob(
      dataURItoBlob(compressedUrl),
      `${baseName(imageFile.name)}_compressed.${resultFormat}`,
      { showToast: true }
    );
  };


  const handleDimensionChange = useCallback((dimension: 'width' | 'height', value: number) => {
    if (!originalDimensions) return;

    setOptions(prev => {
      const newOptions = { ...prev };

      if (prev.maintainAspectRatio) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;

        if (dimension === 'width') {
          newOptions.width = clampDimension(value);
          newOptions.height = clampDimension(newOptions.width / aspectRatio);
        } else {
          newOptions.height = clampDimension(value);
          newOptions.width = clampDimension(newOptions.height * aspectRatio);
        }
      } else {
        newOptions[dimension] = clampDimension(value);
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
      breadcrumbLabel="Image Converter"
      faq={[
        {
          question: 'Which output formats are available?',
          answer: 'PNG, JPG and WebP. WebP usually gives the smallest files.',
        },
        {
          question: 'What happens to transparency when converting to JPG?',
          answer: 'JPG does not support transparency, so transparent areas are filled with white automatically.',
        },
        {
          question: 'Are my images uploaded to a server?',
          answer: 'No. Conversion happens entirely in your browser — your images never leave your device.',
        },
        {
          question: 'Can I swap in a different image after uploading?',
          answer: 'Yes — drop a new image onto the preview frame (or click it to browse) and it instantly replaces the current one.',
        },
        {
          question: 'Can I compress the converted image too?',
          answer: 'Yes — the result card includes a quality slider with a live file-size comparison, so you can compress further and download without opening a separate tool.',
        },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="bg-white/[0.03] border-white/10">
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
              previewSrc={imageUrl}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Options */}
        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              Conversion Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="output-format" className="text-white">Output Format</Label>
              <Select value={options.format} onValueChange={(value) => setOptions(prev => ({ ...prev, format: value }))}>
                <SelectTrigger id="output-format" className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {options.format === 'jpeg' && (
              <div className="space-y-2">
                <Label className="text-white">Quality: {options.quality}%</Label>
                <Slider
                  aria-label="Quality"
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
                    <Label htmlFor="convert-width" className="text-white">Width</Label>
                    <input
                      id="convert-width"
                      type="number"
                      value={options.width || ''}
                      onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      min="1"
                      max={MAX_DIMENSION}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="convert-height" className="text-white">Height</Label>
                    <input
                      id="convert-height"
                      type="number"
                      value={options.height || ''}
                      onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      min="1"
                      max={MAX_DIMENSION}
                    />
                  </div>
                </div>
              </>
            )}

            <Divider />

            <Button
              onClick={handleConvert}
              disabled={!imageFile || isConverting}
              className="w-full bg-primary-action hover:bg-primary-action/90 shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300"
            >
              {isConverting ? 'Converting...' : 'Convert Image'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result Section */}
      {convertedImage && (
        <>
          <Divider label="Result" className="mt-6 mb-4" />
          <Card className="bg-white/[0.03] border-white/10">
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
                  <strong>Format:</strong> {resultFormat.toUpperCase()}
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

            {isLossyFormat ? (
              <div className="pt-2">
                <Divider label="Compress" />
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compress-quality" className="text-sm text-gray-300">
                      Quality: {compressQuality}%
                    </Label>
                    <span className="text-xs text-gray-400">
                      {compressedUrl
                        ? sizeSaved > 0
                          ? `${(convertedSize / 1024).toFixed(1)} KB → ${(compressedSize / 1024).toFixed(1)} KB (−${sizeSaved}%)`
                          : 'No gain at this quality'
                        : 'Calculating…'}
                    </span>
                  </div>
                  <Slider
                    id="compress-quality"
                    aria-label="Compression quality"
                    value={[compressQuality]}
                    onValueChange={([value]) => setCompressQuality(value)}
                    min={10}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                  <Button
                    onClick={handleDownloadCompressed}
                    disabled={!compressedUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download compressed
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 pt-4 border-t border-white/10">
                {resultFormat.toUpperCase()} is lossless — pick JPEG or WebP in Conversion
                Options and convert again to enable compression.
              </p>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </ToolPageLayout>
  );
};

export default ImageConverter;