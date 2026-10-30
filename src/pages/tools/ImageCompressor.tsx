import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Download, FileImage, Gauge, Minimize2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import errorLogger, { ErrorCategory } from '@/utils/errorLogger';
import ErrorBoundary from '@/components/ErrorBoundary';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import ComparePanes from '@/components/tools/ComparePanes';
import QualitySlider from '@/components/tools/QualitySlider';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { config } from '@/config';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { useObjectUrl, useUrlFileLoader } from '@/hooks';
import { cn } from '@/lib/utils';
import { guideCard, guideHeading, primaryButton, statusRow, toolDropzone, toolWorkspace, toolbarRow } from '@/styles/constants';
import { downloadBlob } from '@/utils/download';
import { dataURItoBlob } from '@/utils/dataConversion';
import { formatFileSize, formatSizeChange } from '@/utils/formatters';

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Minimize2 className="h-5 w-5" aria-hidden="true" />
      </span>
      Getting Smaller Images
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Gauge className="h-5 w-5" aria-hidden="true" />
          Choosing a Quality
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('80-90%:', 'large photos where details matter.')}
          {guideItem('60-75%:', 'websites, email and social media.')}
          {guideItem('Below 50%:', 'thumbnails. Blocks and halos become visible.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <FileImage className="h-5 w-5" aria-hidden="true" />
          What Changes in the File
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Format:', 'the result is always a JPG.')}
          {guideItem('Transparency:', 'transparent areas become white.')}
          {guideItem('Size:', 'images over 2000 px on the longest side are scaled down.')}
          {guideItem('GIFs:', 'only the first frame is kept.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          When the File Gets Larger
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          Images that are already compressed have little left to remove, and logos or screenshots with few colors are
          often smaller as PNG than as JPG. The status bar shows the change. If the result is larger, keep your original
          or try WebP in the Image Converter.
        </p>
      </section>
    </div>
  </div>
);

const ImageCompressor = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(70);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  // Bumped per run and per file change so a stale compression can't overwrite a newer one
  const runIdRef = useRef(0);
  const originalUrl = useObjectUrl(imageFile);
  const compressedSize = useMemo(
    () => (compressedUrl ? dataURItoBlob(compressedUrl).size : null),
    [compressedUrl]
  );

  const resetImage = () => {
    runIdRef.current++;
    setImageFile(null);
    setCompressedUrl(null);
    setIsCompressing(false);
  };

  const handleFileSelected = (file: File) => {
    try {
      runIdRef.current++;
      setImageFile(file);
      setCompressedUrl(null);
      toast.success('Image loaded successfully!');
    } catch (error) {
      errorLogger.logFileProcessingError(
        error as Error,
        file,
        'Failed to process selected file',
        'handleFileSelected'
      );
      toast.error('Failed to load image. Please try again.');
    }
  };

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: 50 * 1024 * 1024,
    onSuccess: (loadedFile) => {
      runIdRef.current++;
      setImageFile(loadedFile);
      setCompressedUrl(null);
    },
    onError: (error) => {
      errorLogger.logFileProcessingError(
        error,
        new File([], 'url-load-error'),
        'Failed to load image from URL',
        'url_load',
        { url: 'redacted' }
      );
    }
  });

  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
  };

  const compressImage = useCallback(() => {
    if (!imageFile) return;

    const runId = ++runIdRef.current;
    setIsCompressing(true);
    const startTime = performance.now();

    try {
      const reader = new FileReader();

      reader.onerror = () => {
        if (runId !== runIdRef.current) return;
        const error = new Error('Failed to read image file');
        errorLogger.logFileProcessingError(
          error,
          imageFile,
          'FileReader failed to read image data',
          'compressImage_fileReader',
          { stage: 'fileReader' }
        );
        toast.error('Failed to read image file. Please try again.');
        setIsCompressing(false);
      };

      reader.onload = (event) => {
        try {
          const img = new window.Image();

          img.onerror = () => {
            if (runId !== runIdRef.current) return;
            const error = new Error('Failed to load image data');
            errorLogger.logFileProcessingError(
              error,
              imageFile,
              'Image element failed to load data',
              'compressImage_imageLoad',
              { stage: 'imageLoad' }
            );
            toast.error('Failed to process image. The file may be corrupted.');
            setIsCompressing(false);
          };

          img.onload = () => {
            if (runId !== runIdRef.current) return;
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                throw new Error('Failed to get canvas 2D context');
              }

              // Calculate new dimensions (maintain aspect ratio)
              const maxDimension = 2000; // Max width/height
              let width = img.width;
              let height = img.height;

              // Validate image dimensions
              if (width <= 0 || height <= 0) {
                throw new Error('Invalid image dimensions');
              }

              if (width > height && width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }

              canvas.width = width;
              canvas.height = height;

              // JPEG has no alpha: fill white so transparent pixels don't turn black
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, width, height);
              // Draw image with new dimensions
              ctx.drawImage(img, 0, 0, width, height);

              // Convert to compressed format
              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality / 100);

              if (!compressedDataUrl || compressedDataUrl === 'data:,') {
                throw new Error('Failed to generate compressed image data');
              }

              setCompressedUrl(compressedDataUrl);
              setIsCompressing(false);

              // Log successful compression
              const endTime = performance.now();
              const processingTime = endTime - startTime;
              const originalSize = imageFile.size;
              const compressedSize = Math.round(compressedDataUrl.length * 0.75); // Approximate size
              const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

              errorLogger.logError({
                message: 'Image compression completed successfully',
                category: ErrorCategory.FILE_PROCESSING,
                context: {
                  component: 'ImageCompressor',
                  action: 'compressImage',
                  userAgent: navigator.userAgent,
                  url: window.location.href
                },
                metadata: {
                  processingTime: `${processingTime.toFixed(2)}ms`,
                  originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
                  compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
                  compressionRatio: `${compressionRatio}%`,
                  quality: quality,
                  dimensions: `${width}x${height}`,
                  originalDimensions: `${img.width}x${img.height}`
                }
              });

            } catch (error) {
              errorLogger.logFileProcessingError(
                error as Error,
                imageFile,
                'Failed during canvas processing or compression',
                'compressImage_canvasProcessing',
                {
                  stage: 'canvasProcessing',
                  quality: quality,
                  imageDimensions: `${img.width}x${img.height}`
                }
              );
              toast.error('Failed to compress image. Please try again.');
              setIsCompressing(false);
            }
          };

          img.src = event.target?.result as string;

        } catch (error) {
          errorLogger.logFileProcessingError(
            error as Error,
            imageFile,
            'Failed to initialize image processing',
            'compressImage_imageInit',
            { stage: 'imageInit' }
          );
          toast.error('Failed to process image. Please try again.');
          setIsCompressing(false);
        }
      };

      reader.readAsDataURL(imageFile);

    } catch (error) {
      errorLogger.logFileProcessingError(
        error as Error,
        imageFile,
        'Failed to start image compression',
        'compressImage_initialization',
        { stage: 'initialization' }
      );
      toast.error('Failed to start image compression. Please try again.');
      setIsCompressing(false);
    }
  }, [imageFile, quality]);

  const handleDownload = () => {
    if (!compressedUrl) return;

    downloadBlob(
      dataURItoBlob(compressedUrl),
      `compressed-${imageFile?.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`,
      { showToast: true }
    );
  };

  useEffect(() => {
    if (imageFile) {
      const timer = setTimeout(() => {
        compressImage();
      }, 300);

      return () => clearTimeout(timer);
    }
    // Return undefined for the case where imageFile is null
    return undefined;
  }, [imageFile, quality, compressImage]);

  const statItems = imageFile
    ? [
        ['Original', formatFileSize(imageFile.size)],
        ['Compressed', compressedSize === null ? '-' : formatFileSize(compressedSize)],
        ['Change', compressedSize === null ? '-' : formatSizeChange(imageFile.size, compressedSize)],
      ]
    : [];

  return (
    <ToolPageLayout
      title="Image Compressor"
      description="Reduce image file size and compare the result with the original. All processing happens in your browser."
      keywords="image compressor, compress images, reduce image size, image optimizer, online image compressor"
      canonicalUrl="/tools/image-compressor"
      pageTitle="Image Compressor | sLixTOOLS"
      pageDescription="Compress your images online for free. Reduce image file size while maintaining good quality. No upload required, all processing happens in your browser."
      breadcrumbLabel="Image Compressor"
      belowTool={seoContent}
      faq={[
        {
          question: 'How much smaller will my image get?',
          answer: 'Typical photos shrink by 50–90% depending on the quality level you choose, with barely visible quality loss.',
        },
        {
          question: 'Which formats can I compress?',
          answer: 'JPG, PNG, WebP and GIF (first frame) are supported. The result is saved as JPG; transparent areas become white.',
        },
        {
          question: 'Is the compression lossless?',
          answer: 'No. The result is a JPG, which is always lossy. Compare both images next to each other to find the lowest quality that still looks good.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {!imageFile ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
              onFileSelected={handleFileSelected}
              fileCategory="image"
              maxFileSize={config.upload.maxFileSize}
              acceptedTypes={['jpg', 'jpeg', 'png', 'webp', 'gif']}
              showUrlInput={true}
              onUrlSubmit={handleUrlSubmit}
              urlPlaceholder={EXTERNAL_URLS.PLACEHOLDERS.IMAGE}
            />
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <SourceChip
                thumbnail={originalUrl}
                name={imageFile.name}
                meta={formatFileSize(imageFile.size)}
                onRemove={resetImage}
              />
              <ToolbarDivider />
              <QualitySlider value={quality} onChange={setQuality} min={10} max={90} step={5} />
              <button
                type="button"
                onClick={handleDownload}
                disabled={!compressedUrl}
                className={cn(primaryButton, 'lg:ml-auto')}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </button>
            </div>

            <ComparePanes
              originalSrc={originalUrl}
              originalMeta={formatFileSize(imageFile.size)}
              resultSrc={compressedUrl}
              resultMeta={compressedSize === null ? undefined : formatFileSize(compressedSize)}
              resultLabel="Compressed"
              emptyText={isCompressing ? 'Compressing...' : 'Preview will appear here'}
            />

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

const ImageCompressorWithErrorBoundary = () => {
  return (
    <ErrorBoundary isFileProcessing={true} showDetailedError={true}>
      <ImageCompressor />
    </ErrorBoundary>
  );
};

export default ImageCompressorWithErrorBoundary;
