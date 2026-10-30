import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Gauge, Minimize2, Scaling, TriangleAlert, Zap } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import ComparePanes from '@/components/tools/ComparePanes';
import QualitySlider from '@/components/tools/QualitySlider';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { compressGif, getOptimalCompressionSettings, supportsAnimatedGifDecode, type CompressionProgress } from '@/utils/gifCompressor';
import { formatFileSize, formatFileSizeMB, formatSizeChange } from '@/utils/formatters';
import { useLoading, useObjectUrl, useUrlFileLoader } from '@/hooks';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { chipButton, guideCard, guideHeading, primaryButton, statusRow, toolDropzone, toolWorkspace, toolbarRow } from '@/styles/constants';
import { downloadBlobWithGeneratedName } from '@/utils/download';

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
      Getting Smaller GIFs
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Gauge className="h-5 w-5" aria-hidden="true" />
          What Quality Does
        </h3>
        <p className="mt-0 text-sm leading-relaxed text-gray-300">
          Lower quality reduces the number of colors in every frame. Flat graphics and screen recordings stay clean for
          a long time, while photos and soft gradients start to show bands. Press Compress again after moving the slider
          to compare.
        </p>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Scaling className="h-5 w-5" aria-hidden="true" />
          Large Files
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Over 5 MB:', 'frames are scaled down to 800 × 600 px at most.')}
          {guideItem('Over 10 MB:', 'every second frame is dropped as well.')}
          {guideItem('Limit:', 'up to 50 MB per GIF.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          Good to Know
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Browser:', 'keeping the animation needs ImageDecoder, as in recent Chrome, Edge or Firefox. Elsewhere only the first frame is kept.')}
          {guideItem('Larger result:', 'optimized GIFs can grow. The status bar shows the change, so keep your original then.')}
        </ul>
      </section>
    </div>
  </div>
);

function GifCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const { isLoading, executeWithLoading } = useLoading();
  const [quality, setQuality] = useState(80);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const originalUrl = useObjectUrl(file);
  const compressedUrl = useObjectUrl(compressedBlob);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setCompressedBlob(null);
  };

  const removeFile = () => {
    setFile(null);
    setCompressedBlob(null);
  };

  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'image',
    maxFileSize: 50 * 1024 * 1024,
    onSuccess: (loadedFile) => {
      setFile(loadedFile);
      setCompressedBlob(null);
    }
  });

  const handleUrlSubmit = async (url: string) => {
    await loadFromUrl(url);
  };

  const handleCompress = async () => {
    if (!file) return;

    setProgress(0);
    setProgressMessage('Starting compression...');
    toast.info('Starting Compression', { description: 'Your GIF is being compressed. Please wait.' });
    if (!supportsAnimatedGifDecode()) {
      toast.warning('Animation will be lost', {
        description: 'This browser cannot decode GIF frames (no ImageDecoder), so only the first frame is kept. Use a recent Chrome, Edge or Firefox.'
      });
    }

    try {
      await executeWithLoading(async () => {
        const optimalSettings = getOptimalCompressionSettings(file.size);
        const compressionOptions = {
          ...optimalSettings,
          quality
        };

        const onProgress = (progressData: CompressionProgress) => {
          setProgress(progressData.progress);
          setProgressMessage(progressData.message);
        };

        const compressedGif = await compressGif(file, compressionOptions, onProgress);
        setCompressedBlob(compressedGif);

        const originalSizeMB = formatFileSizeMB(file.size);
        const compressedSizeMB = formatFileSizeMB(compressedGif.size);
        const compressionRatio = (((file.size - compressedGif.size) / file.size) * 100).toFixed(1);

        toast.success('Compression Successful!', {
          description: `Reduced from ${originalSizeMB} to ${compressedSizeMB} (${compressionRatio}% reduction)`
        });
      });
    } catch (error) {
      // Error details are logged to error reporting system
      toast.error('Compression Failed', {
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      });
    }

    setProgress(0);
    setProgressMessage('');
  };

  const handleDownload = () => {
    if (!compressedBlob) return;
    downloadBlobWithGeneratedName(
      compressedBlob,
      'sLixTOOLS-compressed',
      file?.name,
      'gif',
      { showToast: true }
    );
  };

  const statItems = file
    ? [
        ['Original', formatFileSize(file.size)],
        ['Compressed', compressedBlob ? formatFileSize(compressedBlob.size) : '-'],
        ['Change', compressedBlob ? formatSizeChange(file.size, compressedBlob.size) : '-'],
      ]
    : [];

  return (
    <ToolPageLayout
      title="GIF Compressor"
      description="Reduce the file size of your animated GIFs and compare the result with the original."
      keywords="gif compressor, gif optimizer, reduce gif size, compress animated gif, gif file size reducer"
      canonicalUrl="/tools/gif-compressor"
      pageTitle="Online GIF Compressor | sLixTOOLS"
      pageDescription="Compress and optimize your GIF files online for free. Reduce GIF file size while maintaining visual quality with sLixTOOLS."
      breadcrumbLabel="GIF Compressor"
      belowTool={seoContent}
      faq={[
        {
          question: 'Does compressing a GIF reduce its quality?',
          answer: 'Yes, it reduces the colors in every frame. At moderate levels the difference is hard to see. Files over 5 MB are also scaled down, and over 10 MB every second frame is dropped.',
        },
        {
          question: 'Is there a file size limit?',
          answer: 'Yes, up to 50 MB per GIF. Processing happens locally, so very large GIFs also depend on your device memory.',
        },
        {
          question: 'Will the output still be a GIF?',
          answer: 'Yes, the output is always a GIF that works everywhere GIFs are supported.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {!file ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
              acceptedTypes={['image/gif']}
              maxFileSize={50 * 1024 * 1024} // 50MB
              onFileSelected={handleFileSelected}
              onUrlSubmit={handleUrlSubmit}
              showUrlInput={true}
              urlPlaceholder={EXTERNAL_URLS.PLACEHOLDERS.ANIMATION_GIF}
              fileCategory="image"
              title="Drop your GIF here"
              description="or click to browse files (GIF)"
            />
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <SourceChip
                thumbnail={originalUrl}
                name={file.name}
                meta={formatFileSize(file.size)}
                onRemove={removeFile}
                disabled={isLoading}
              />
              <ToolbarDivider />
              <QualitySlider value={quality} onChange={setQuality} min={10} max={100} step={1} disabled={isLoading} />
              <div className="flex items-center gap-2 lg:ml-auto">
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={isLoading}
                  className={compressedBlob ? chipButton : primaryButton}
                >
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? 'Compressing...' : 'Compress'}
                </button>
                {compressedBlob && (
                  <button type="button" onClick={handleDownload} className={primaryButton}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </button>
                )}
              </div>
            </div>

            <ComparePanes
              originalSrc={originalUrl}
              originalMeta={formatFileSize(file.size)}
              resultSrc={compressedUrl}
              resultMeta={compressedBlob ? formatFileSize(compressedBlob.size) : undefined}
              resultLabel="Compressed"
              emptyText={isLoading ? 'Compressing...' : 'Press Compress to see the result'}
            />

            <dl className={statusRow}>
              {statItems.map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt>{label}:</dt>
                  <dd className="tabular-nums text-slate-200">{value}</dd>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-1.5">
                  <dt>{progressMessage}</dt>
                  <dd className="tabular-nums text-slate-200">{Math.round(progress)}%</dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
    </ToolPageLayout>
  );
}

export default GifCompressor;
