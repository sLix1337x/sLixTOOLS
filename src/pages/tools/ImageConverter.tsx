import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FileImage, Settings, Download, X, Archive } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
import FileUploadArea from '@/components/FileUploadArea';
import { toast } from 'sonner';
import { useUrlFileLoader } from '@/hooks';
import { downloadBlob } from '@/utils/download';
import { config } from '@/config';

interface ConversionOptions {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

interface Item {
  id: number;
  file: File;
  url: string;
  width: number;
  height: number;
  resultBlob?: Blob | undefined;
  resultUrl?: string | undefined;
  error?: string | undefined;
}

const MAX_DIMENSION = 16384; // 16384² is also Chromium's max canvas area
const MAX_FILES = 50;

const MIME: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const EXT: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

const clampDimension = (value: number) =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.round(value) || 1));

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

const ImageConverter = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    format: 'jpeg',
    quality: 85,
    width: 0,
    height: 0,
    maintainAspectRatio: true
  });
  const nextId = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  const setAll = (next: Item[]) => {
    itemsRef.current = next;
    setItems(next);
  };

  // Free every object URL on unmount
  useEffect(() => () => {
    itemsRef.current.forEach(i => {
      URL.revokeObjectURL(i.url);
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
  }, []);

  const addFile = useCallback((file: File) => {
    if (itemsRef.current.length >= MAX_FILES) {
      toast.error(`Up to ${MAX_FILES} images at a time`);
      return;
    }
    const url = URL.createObjectURL(file);
    const id = nextId.current++;
    const probe = new Image();
    probe.onload = () => {
      if (itemsRef.current.length >= MAX_FILES) {
        URL.revokeObjectURL(url);
        return;
      }
      setAll([...itemsRef.current, { id, file, url, width: probe.width, height: probe.height }]);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(`Could not read ${file.name}`, { description: 'Your browser may not support its format.' });
    };
    probe.src = url;
  }, []);

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: config.upload.maxFileSize,
    onSuccess: addFile
  });

  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
  };

  const revokeItem = (i: Item) => {
    URL.revokeObjectURL(i.url);
    if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
  };

  const removeItem = (id: number) => {
    const item = itemsRef.current.find(i => i.id === id);
    if (item) revokeItem(item);
    setAll(itemsRef.current.filter(i => i.id !== id));
  };

  const clearAll = () => {
    itemsRef.current.forEach(revokeItem);
    setAll([]);
  };

  // Resize fields only apply to a single image; batches keep each original size
  const single = items.length === 1 ? items[0] : null;
  const originalDimensions = single ? { width: single.width, height: single.height } : null;
  const singleId = single?.id;
  useEffect(() => {
    const only = itemsRef.current.length === 1 ? itemsRef.current[0] : null;
    if (only) setOptions(prev => ({ ...prev, width: only.width, height: only.height }));
  }, [singleId]);

  const convertOne = (item: Item, opts: ConversionOptions, useSize: boolean): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = clampDimension(useSize ? opts.width || img.width : img.width);
          canvas.height = clampDimension(useSize ? opts.height || img.height : img.height);
          const ctx = canvas.getContext('2d');
          const mimeType = MIME[opts.format] ?? 'image/png';
          if (ctx && opts.format === 'jpeg') {
            // JPEG has no alpha: fill white so transparent pixels don't turn black
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const quality = opts.format === 'png' ? undefined : opts.quality / 100;
          canvas.toBlob(blob => {
            // Unsupported formats silently fall back to PNG; oversized canvases yield null
            if (!blob || blob.type !== mimeType) {
              reject(new Error(`Your browser could not encode a ${canvas.width}×${canvas.height} ${opts.format.toUpperCase()} image`));
            } else {
              resolve(blob);
            }
          }, mimeType, quality);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = item.url;
    });

  const handleConvert = useCallback(async () => {
    const batch = itemsRef.current;
    if (batch.length === 0) {
      toast.error('Please select an image file first');
      return;
    }
    setIsConverting(true);
    const useSize = batch.length === 1;
    let failed = 0;
    for (const item of batch) {
      let patch: Partial<Item>;
      try {
        const blob = await convertOne(item, options, useSize);
        patch = { resultBlob: blob, resultUrl: URL.createObjectURL(blob), error: undefined };
      } catch (error) {
        failed++;
        patch = { resultBlob: undefined, resultUrl: undefined, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      // Items may have been removed or re-converted mid-run; patch by id against the live list
      const live = itemsRef.current.find(i => i.id === item.id);
      if (!live) {
        if (patch.resultUrl) URL.revokeObjectURL(patch.resultUrl);
        continue;
      }
      if (live.resultUrl) URL.revokeObjectURL(live.resultUrl);
      setAll(itemsRef.current.map(i => (i.id === item.id ? { ...i, ...patch } : i)));
    }
    setIsConverting(false);
    if (failed === 0) toast.success(batch.length > 1 ? `Converted ${batch.length} images` : 'Image converted successfully!');
    else toast.error(`${failed} of ${batch.length} failed to convert`);
  }, [options]);

  // Format of the actual result (not the current dropdown selection)
  const ext = (item: Item) => EXT[(item.resultBlob?.type ?? '').replace('image/', '')] ?? 'png';
  const outName = (item: Item) => `${baseName(item.file.name)}_converted.${ext(item)}`;

  const done = items.filter(i => i.resultBlob);

  const handleDownloadZip = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const used = new Set<string>();
    for (const item of done) {
      let name = outName(item);
      for (let n = 2; used.has(name); n++) name = `${baseName(item.file.name)}_converted_${n}.${ext(item)}`;
      used.add(name);
      zip.file(name, item.resultBlob!);
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'converted_images.zip', { showToast: true });
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
      description="Convert one or many images between formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
      keywords="image converter, batch image converter, jpeg to png, png to jpeg, webp converter, image format converter"
      canonicalUrl="/tools/image-converter"
      pageTitle="Image Converter"
      pageDescription="Convert one or many images between formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
      breadcrumbLabel="Image Converter"
      faq={[
        {
          question: 'Which output formats are available?',
          answer: 'PNG, JPG and WebP. WebP usually gives the smallest files.',
        },
        {
          question: 'Can I convert several images at once?',
          answer: `Yes — drop or pick up to ${MAX_FILES} images, convert them in one click and download them individually or as a single ZIP.`,
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
          question: 'Can I compress while converting?',
          answer: 'Yes — JPEG and WebP output have a quality slider; lower it to shrink files. Each row shows the before and after size.',
        },
      ]}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileImage className="h-5 w-5" />
              Upload Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadArea
              onFileSelected={addFile}
              onUrlSubmit={handleUrlSubmit}
              acceptedTypes={['image/*']}
              maxFileSize={config.upload.maxFileSize}
              fileCategory="image"
              title="Drop your images here"
              description="or click to browse — select as many as you like (JPG, PNG, WEBP, GIF)"
              showUrlInput={true}
              multiple
            />

            {items.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-300">
                    <strong>{items.length}</strong> image{items.length > 1 ? 's' : ''}
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-gray-400">
                    Clear all
                  </Button>
                </div>
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {items.map(item => (
                    <li key={item.id} className="flex items-center gap-3 p-2 rounded-md bg-white/[0.03] border border-white/10">
                      <img src={item.resultUrl ?? item.url} alt="" className="h-12 w-12 object-cover rounded" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm text-white truncate">{item.file.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.width} × {item.height} · {kb(item.file.size)}
                          {item.resultBlob && (
                            <span className="text-sky-400"> → {kb(item.resultBlob.size)} {ext(item).toUpperCase()}</span>
                          )}
                        </p>
                        {item.error && <p className="text-xs text-red-400">{item.error}</p>}
                      </div>
                      {item.resultBlob && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Download ${item.file.name}`}
                          onClick={() => downloadBlob(item.resultBlob!, outName(item), { showToast: true })}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Remove ${item.file.name}`} onClick={() => removeItem(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
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

            {options.format !== 'png' && (
              <div className="space-y-2">
                <Label className="text-white">Quality: {options.quality}%</Label>
                <Slider
                  aria-label="Quality"
                  value={[options.quality]}
                  onValueChange={([value]) => setOptions(prev => ({ ...prev, quality: value ?? prev.quality }))}
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

            {items.length > 1 && (
              <p className="text-xs text-gray-400">Batch mode keeps each image at its original size.</p>
            )}

            <Divider />

            <Button
              onClick={handleConvert}
              disabled={items.length === 0 || isConverting}
              className="w-full bg-primary-action hover:bg-primary-action/90 shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300"
            >
              {isConverting
                ? 'Converting...'
                : items.length > 1
                  ? `Convert ${items.length} Images`
                  : 'Convert Image'}
            </Button>

            {done.length > 1 && (
              <Button onClick={handleDownloadZip} className="w-full bg-blue-600 hover:bg-blue-700">
                <Archive className="h-4 w-4 mr-2" />
                Download all ({done.length}) as ZIP
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </ToolPageLayout>
  );
};

export default ImageConverter;
