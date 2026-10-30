import { useState, useCallback, useEffect, useRef } from 'react';
import { Archive, Download, FileImage, Gauge, Images, Layers, X } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import QualitySlider from '@/components/tools/QualitySlider';
import SizeFields from '@/components/tools/SizeFields';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Tooltip } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useUrlFileLoader } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  chipButton,
  guideCard,
  guideHeading,
  primaryButton,
  segmentButton,
  segmentGroup,
  statusRow,
  toolButton,
  toolDropzone,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';
import { downloadBlob } from '@/utils/download';
import { formatFileSize, formatSizeChange } from '@/utils/formatters';
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

const FORMATS = [['jpeg', 'JPEG'], ['png', 'PNG'], ['webp', 'WebP']] as const;

// Icon buttons sit on the image, so they need their own backdrop
const tileButton = cn(toolButton, 'h-7 w-7 bg-slate-950/70');

const MIME: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const EXT: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

const clampDimension = (value: number) =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.round(value) || 1));

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <FileImage className="h-5 w-5" aria-hidden="true" />
      </span>
      Converting Images
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Images className="h-5 w-5" aria-hidden="true" />
          Which Format for What
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('JPEG:', 'photos. Small and supported everywhere, no transparency.')}
          {guideItem('PNG:', 'logos, screenshots, text. Lossless, keeps transparency.')}
          {guideItem('WebP:', 'websites. Usually the smallest, keeps transparency.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Gauge className="h-5 w-5" aria-hidden="true" />
          Quality and Size
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          JPEG and WebP get smaller as quality drops, 75-85% suits most images. PNG has no quality setting because it is
          lossless. Converting a JPEG to PNG does not bring back lost detail and usually makes the file larger. Every
          tile shows the size before and after.
        </p>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Layers className="h-5 w-5" aria-hidden="true" />
          Batches
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Limit:', `up to ${MAX_FILES} images at a time.`)}
          {guideItem('Size:', 'width and height apply to a single image. Batches keep their original size.')}
          {guideItem('Download:', 'save tiles one by one, or all as ZIP from two converted images.')}
          {guideItem('GIFs:', 'only the first frame is converted.')}
        </ul>
      </section>
    </div>
  </div>
);

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
    if (!single) return;

    setOptions(prev => {
      const newOptions = { ...prev };

      if (prev.maintainAspectRatio) {
        const aspectRatio = single.width / single.height;

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
  }, [single]);

  const failed = items.filter(i => i.error).length;
  const convertedSize = done.reduce((sum, i) => sum + (i.resultBlob?.size ?? 0), 0);
  const convertedOriginalSize = done.reduce((sum, i) => sum + i.file.size, 0);
  const statItems = [
    ['Images', items.length],
    ['Original', formatFileSize(items.reduce((sum, i) => sum + i.file.size, 0))],
    ['Converted', done.length > 0 ? `${formatFileSize(convertedSize)} (${done.length} of ${items.length})` : '-'],
    ['Change', done.length > 0 ? formatSizeChange(convertedOriginalSize, convertedSize) : '-'],
    ...(failed > 0 ? [['Failed', failed]] : []),
  ];

  return (
    <ToolPageLayout
      title="Image Converter"
      description="Convert one or many images between formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
      keywords="image converter, batch image converter, jpeg to png, png to jpeg, webp converter, image format converter"
      canonicalUrl="/tools/image-converter"
      pageTitle="Image Converter | sLixTOOLS"
      pageDescription="Convert one or many images between formats with customizable quality and size settings. All processing happens in your browser for maximum privacy."
      breadcrumbLabel="Image Converter"
      belowTool={seoContent}
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
          answer: 'Yes — JPEG and WebP output have a quality slider; lower it to shrink files. Each tile shows the before and after size.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {items.length === 0 ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
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
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <p className="mt-0 text-sm font-medium text-white">
                {items.length} image{items.length > 1 ? 's' : ''}
              </p>
              <ToolbarDivider />
              <fieldset
                disabled={isConverting}
                className="flex min-w-0 grow basis-full flex-wrap items-center gap-x-4 gap-y-2 lg:basis-0"
              >
                <div role="group" aria-label="Output format" className={segmentGroup}>
                  {FORMATS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={options.format === value}
                      onClick={() => setOptions(prev => ({ ...prev, format: value }))}
                      className={segmentButton}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {options.format !== 'png' && (
                  <QualitySlider
                    value={options.quality}
                    onChange={(quality) => setOptions(prev => ({ ...prev, quality }))}
                    min={10}
                    max={100}
                    step={5}
                    disabled={isConverting}
                  />
                )}
                {single ? (
                  <SizeFields
                    width={options.width ?? 0}
                    height={options.height ?? 0}
                    max={MAX_DIMENSION}
                    locked={options.maintainAspectRatio}
                    onWidthChange={(value) => handleDimensionChange('width', value)}
                    onHeightChange={(value) => handleDimensionChange('height', value)}
                    onLockedChange={(locked) => setOptions(prev => ({ ...prev, maintainAspectRatio: locked }))}
                  />
                ) : (
                  <p className="mt-0 text-xs text-slate-400">Batch mode keeps each image at its original size.</p>
                )}
              </fieldset>
              <div className="flex items-center gap-2 lg:ml-auto">
                <button type="button" onClick={clearAll} className={chipButton}>
                  Clear
                </button>
                {done.length > 1 && (
                  <button type="button" onClick={handleDownloadZip} className={chipButton}>
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    ZIP
                  </button>
                )}
                <button type="button" onClick={handleConvert} disabled={isConverting} className={primaryButton}>
                  {isConverting ? 'Converting...' : items.length > 1 ? `Convert ${items.length}` : 'Convert'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
                <li className="flex min-h-44">
                  <FileUploadArea
                    fill
                    onFileSelected={addFile}
                    acceptedTypes={['image/*']}
                    maxFileSize={config.upload.maxFileSize}
                    fileCategory="image"
                    title="Add images"
                    description="Drop or click"
                    className="!p-3"
                    multiple
                  />
                </li>
                {items.map(item => (
                  <li key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                    <div className="relative aspect-square bg-black/30">
                      <img src={item.resultUrl ?? item.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                      <div className="absolute right-1 top-1 flex gap-1">
                        {item.resultBlob && (
                          <Tooltip label="Download" side="bottom">
                            <button
                              type="button"
                              aria-label={`Download ${item.file.name}`}
                              onClick={() => downloadBlob(item.resultBlob!, outName(item), { showToast: true })}
                              className={tileButton}
                            >
                              <Download className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip label="Remove" side="bottom">
                          <button
                            type="button"
                            aria-label={`Remove ${item.file.name}`}
                            onClick={() => removeItem(item.id)}
                            className={tileButton}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="min-w-0 space-y-0.5 p-2">
                      <p className="mt-0 truncate text-xs font-medium text-white" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="mt-0 font-mono text-[11px] text-slate-400">
                        {item.width} × {item.height} · {formatFileSize(item.file.size)}
                      </p>
                      {item.resultBlob && (
                        <p className="mt-0 font-mono text-[11px] text-sky-400">
                          {ext(item).toUpperCase()} · {formatFileSize(item.resultBlob.size)}
                        </p>
                      )}
                      {item.error && <p className="mt-0 break-words text-[11px] text-red-400">{item.error}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <dl className={statusRow}>
              {statItems.map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt>{label}:</dt>
                  <dd className="tabular-nums text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ImageConverter;
