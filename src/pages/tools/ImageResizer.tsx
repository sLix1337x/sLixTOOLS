import { useMemo, useState, useRef } from 'react';
import { Download, ExternalLink, FileImage, Link2, Ruler, Scaling } from 'lucide-react';
import { toast } from 'sonner';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SizeFields from '@/components/tools/SizeFields';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { Tooltip } from '@/components/ui/tooltip';
import { useLoading, useUrlFileLoader } from '@/hooks';
import { downloadBlob } from '@/utils/download';
import { config } from '@/config';
import { EXTERNAL_URLS } from '@/config/externalUrls';
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
import { dataURItoBlob } from '@/utils/dataConversion';
import { formatFileSize } from '@/utils/formatters';

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

const PREVIEW_MODES = ['Original', 'Resized'] as const;

const MAX_DIMENSION = 16384; // 16384² is also Chromium's max canvas area

const clampDimension = (value: number) =>
  Math.min(MAX_DIMENSION, Math.max(1, Math.round(value) || 1));

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Scaling className="h-5 w-5" aria-hidden="true" />
      </span>
      Resizing Images
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Ruler className="h-5 w-5" aria-hidden="true" />
          Common Sizes
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Full HD:', '1920 × 1080 px.')}
          {guideItem('Link preview:', '1200 × 630 px.')}
          {guideItem('Square post:', '1080 × 1080 px.')}
          {guideItem('Video thumbnail:', '1280 × 720 px.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Link2 className="h-5 w-5" aria-hidden="true" />
          Keeping Proportions
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          With the lock on, changing one side updates the other. Turn it off to set both sides freely, but a different
          ratio stretches the image because nothing is cropped. Scaling down stays sharp, scaling up beyond 2x looks
          soft.
        </p>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <FileImage className="h-5 w-5" aria-hidden="true" />
          The Result
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Format:', 'always JPG at 90% quality.')}
          {guideItem('Transparency:', 'transparent areas become white.')}
          {guideItem('GIFs:', 'only the first frame is kept.')}
          {guideItem('Limit:', 'up to 16,384 px per side.')}
        </ul>
      </section>
    </div>
  </div>
);

const ImageResizer = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { isLoading: isResizing, executeWithLoading: executeResizing } = useLoading();
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [resizedSize, setResizedSize] = useState({ width: 0, height: 0 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resizedBytes = useMemo(
    () => (resizedImageUrl ? dataURItoBlob(resizedImageUrl).size : null),
    [resizedImageUrl]
  );
  // Bumped on every new file, reset or size change so in-flight work is ignored
  const fileGenRef = useRef(0);

  const processImageFile = (file: File) => {
    const gen = ++fileGenRef.current;
    setResizedImageUrl(null);
    setShowResult(false);
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
              if (gen === fileGenRef.current) {
                setResizedImageUrl(resizedDataUrl);
                setShowResult(true);
              }
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

  const handleOpenInNewTab = () => {
    if (!resizedImageUrl) return;
    // Browsers block top-level navigation to data: URLs; use a blob URL
    const url = URL.createObjectURL(dataURItoBlob(resizedImageUrl));
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  // The result only matches the size it was made for
  const changeSize = (size: { width: number; height: number }) => {
    fileGenRef.current++;
    setResizedSize(size);
    setResizedImageUrl(null);
    setShowResult(false);
  };

  const handleWidthChange = (value: number) => {
    if (maintainAspectRatio && originalSize.width > 0) {
      const ratio = originalSize.height / originalSize.width;
      changeSize({
        width: clampDimension(value),
        height: clampDimension(clampDimension(value) * ratio)
      });
    } else {
      changeSize({ ...resizedSize, width: clampDimension(value) });
    }
  };

  const handleHeightChange = (value: number) => {
    if (maintainAspectRatio && originalSize.height > 0) {
      const ratio = originalSize.width / originalSize.height;
      changeSize({
        width: clampDimension(clampDimension(value) * ratio),
        height: clampDimension(value)
      });
    } else {
      changeSize({ ...resizedSize, height: clampDimension(value) });
    }
  };

  const resetImage = () => {
    fileGenRef.current++;
    setImageFile(null);
    setPreviewUrl(null);
    setResizedImageUrl(null);
    setShowResult(false);
  };

  const statItems = imageFile
    ? [
        ['Original', `${originalSize.width} × ${originalSize.height} px`],
        ['Resized', `${resizedSize.width} × ${resizedSize.height} px`],
        ['File size', resizedBytes === null ? '-' : formatFileSize(resizedBytes)],
      ]
    : [];

  return (
    <ToolPageLayout
      title="Image Resizer"
      description="Resize your images to any dimension. Supports JPG, PNG, GIF, WebP, and more."
      keywords="image resizer, resize images, image size reducer, online image editor, image tools"
      canonicalUrl="/tools/image-resizer"
      pageTitle="Image Resizer | sLixTOOLS"
      pageDescription="Resize your images online for free. Adjust width and height while maintaining aspect ratio. Supports multiple image formats including JPG, PNG, GIF, WebP, and more."
      breadcrumbLabel="Image Resizer"
      belowTool={seoContent}
      faq={[
        {
          question: 'Will resizing affect image quality?',
          answer: 'Scaling down keeps images sharp because pixels are recalculated with interpolation. Upscaling beyond 2x can look soft.',
        },
        {
          question: 'Can I keep the aspect ratio?',
          answer: 'Yes. The lock next to the size fields is on by default, so the height adjusts automatically when you change the width, or vice versa.',
        },
        {
          question: 'Which formats are supported?',
          answer: 'JPG, PNG, WebP, GIF, BMP, APNG and AVIF. The resized image is exported as JPG.',
        },
        {
          question: 'Can I preview the image before resizing?',
          answer: 'Yes. Your image appears right away. After resizing you can switch between Original and Resized, then download the result or open it in a new tab.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {!imageFile ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
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
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <SourceChip
                thumbnail={previewUrl}
                name={imageFile.name}
                meta={`${originalSize.width} × ${originalSize.height} px · ${formatFileSize(imageFile.size)}`}
                onRemove={resetImage}
              />
              <ToolbarDivider />
              <fieldset
                disabled={isResizing}
                className="flex min-w-0 grow basis-full flex-wrap items-center gap-x-4 gap-y-2 lg:basis-0"
              >
                <SizeFields
                  width={resizedSize.width}
                  height={resizedSize.height}
                  max={MAX_DIMENSION}
                  locked={maintainAspectRatio}
                  onWidthChange={handleWidthChange}
                  onHeightChange={handleHeightChange}
                  onLockedChange={setMaintainAspectRatio}
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      changeSize({
                        width: clampDimension(originalSize.width * 0.5),
                        height: clampDimension(originalSize.height * 0.5),
                      })
                    }
                    className={chipButton}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      changeSize({
                        width: clampDimension(originalSize.width),
                        height: clampDimension(originalSize.height),
                      })
                    }
                    className={chipButton}
                  >
                    Reset
                  </button>
                </div>
                {resizedImageUrl && (
                  <div role="group" aria-label="Preview" className={segmentGroup}>
                    {PREVIEW_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={showResult === (mode === 'Resized')}
                        onClick={() => setShowResult(mode === 'Resized')}
                        className={segmentButton}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
              <div className="flex items-center gap-1 lg:ml-auto">
                <button
                  type="button"
                  onClick={handleResize}
                  disabled={isResizing || !!resizedImageUrl}
                  className={primaryButton}
                >
                  {isResizing ? 'Resizing...' : 'Resize'}
                </button>
                <Tooltip label="Download" hint="Saves the resized image as JPG." side="bottom">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!resizedImageUrl}
                    aria-label="Download resized image"
                    className={toolButton}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip label="Open in new tab" side="bottom">
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    disabled={!resizedImageUrl}
                    aria-label="Open resized image in new tab"
                    className={toolButton}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="relative min-h-[40dvh] flex-1 lg:min-h-0">
              <img
                src={(showResult ? resizedImageUrl : previewUrl) ?? undefined}
                alt={showResult ? 'Resized preview' : 'Preview of uploaded image'}
                className="absolute inset-0 h-full w-full object-contain p-4"
              />
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

export default ImageResizer;
