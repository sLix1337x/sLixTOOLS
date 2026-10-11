import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileImage, Download, Zap, Settings, Gauge, Minimize2 } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
import FileUploadArea from '@/components/FileUploadArea';
import { compressGif, getOptimalCompressionSettings, supportsAnimatedGifDecode, type CompressionProgress } from '@/utils/gifCompressor';
import { formatFileSizeMB } from '@/utils/formatters';
import { useLoading, useUrlFileLoader } from '@/hooks';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { downloadBlobWithGeneratedName } from '@/utils/download';
import ToolActionButton from '@/components/tools/ToolActionButton';

function GifCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const { isLoading, executeWithLoading } = useLoading();
  const [quality, setQuality] = useState(80);
  const [compressionMethod, setCompressionMethod] = useState<'standard' | 'gifsicle' | 'lossy'>('standard');
  const [lossyLevel, setLossyLevel] = useState(80);
  const [optimizationLevel, setOptimizationLevel] = useState(2);
  const [dithering, setDithering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
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
          quality,
          compressionMethod,
          lossyLevel,
          optimizationLevel,
          dithering,
          interlaced: false
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

  return (
    <ToolPageLayout
      title="GIF Compressor"
      description="Reduce the file size of your animated GIFs while maintaining quality and vibrancy."
      keywords="gif compressor, gif optimizer, reduce gif size, compress animated gif, gif file size reducer"
      canonicalUrl="/tools/gif-compressor"
      pageTitle="Online GIF Compressor | sLixTOOLS"
      pageDescription="Compress and optimize your GIF files online for free. Reduce GIF file size while maintaining visual quality with sLixTOOLS."
      breadcrumbLabel="GIF Compressor"
      faq={[
        {
          question: 'Does compressing a GIF reduce its quality?',
          answer: 'Compression removes redundant pixel data between frames. At moderate levels the difference is barely visible while the file gets much smaller.',
        },
        {
          question: 'Is there a file size limit?',
          answer: 'The limit depends on your device memory since processing happens locally in your browser — there are no server-side limits.',
        },
        {
          question: 'Will the output still be a GIF?',
          answer: 'Yes, the output is always an optimized GIF that works everywhere GIFs are supported.',
        },
      ]}
    >
      {!file ? (
        <FileUploadArea
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
      ) : (
        <div className="space-y-8">
          <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <FileImage className="h-10 w-10 text-sky-400" />
                  <div>
                    <p className="font-medium text-gray-200">{file.name}</p>
                    <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button
                  onClick={() => setFile(null)}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Remove
                </Button>
              </div>

              {compressedBlob && (
                <div className="mb-6 p-4 bg-sky-400/10 border border-sky-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-400 font-medium">Compression Complete!</p>
                      <p className="text-sm text-gray-300">
                        Original: {(file.size / 1024).toFixed(2)} KB →
                        Compressed: {(compressedBlob.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      onClick={handleDownload}
                      className="bg-primary-action text-white hover:bg-primary-action/90 shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Compression Method</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['standard', 'gifsicle', 'lossy'] as const).map((method) => {
                      const MethodIcon = { standard: Settings, gifsicle: Gauge, lossy: Minimize2 }[method];
                      return (
                      <button
                        key={method}
                        onClick={() => setCompressionMethod(method)}
                        className={`p-3 rounded-lg border text-left transition-all ${compressionMethod === method
                          ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                          : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                          }`}
                      >
                        <div className="font-medium capitalize flex items-center gap-2">
                          <MethodIcon className="h-4 w-4" aria-hidden="true" />
                          {method}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {method === 'standard' && 'Balanced quality & size'}
                          {method === 'gifsicle' && 'Maximum compression'}
                          {method === 'lossy' && 'Smallest file size'}
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </div>

                {compressionMethod === 'standard' && (
                  <div className="space-y-4 p-4 bg-blue-400/5 rounded-lg border border-blue-400/20">
                    <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      Standard Compression Options
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Quality: {quality}%</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Lower Quality</span>
                        <span>Higher Quality</span>
                      </div>
                    </div>
                  </div>
                )}

                {compressionMethod === 'gifsicle' && (
                  <div className="space-y-4 p-4 bg-sky-400/5 rounded-lg border border-sky-400/20">
                    <h4 className="text-sm font-medium text-sky-400 flex items-center gap-2">
                      <Gauge className="h-4 w-4" aria-hidden="true" />
                      Gifsicle Compression Options
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Optimization Level: {optimizationLevel}</label>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={optimizationLevel}
                        onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Fast</span>
                        <span>Best</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="dithering"
                        checked={dithering}
                        onChange={(e) => setDithering(e.target.checked)}
                        className="w-4 h-4 text-blue-400 bg-gray-700 border-gray-600 rounded focus:ring-blue-400 focus:ring-2"
                      />
                      <label htmlFor="dithering" className="text-sm text-gray-300">Enable Dithering</label>
                    </div>
                  </div>
                )}

                {compressionMethod === 'lossy' && (
                  <div className="space-y-4 p-4 bg-purple-400/5 rounded-lg border border-purple-400/20">
                    <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                      <Minimize2 className="h-4 w-4" aria-hidden="true" />
                      Lossy Compression Options
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Lossy Level: {lossyLevel}%</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={lossyLevel}
                        onChange={(e) => setLossyLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Aggressive</span>
                        <span>Conservative</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Divider className="my-6" />

              <div className="flex justify-center">
                <ToolActionButton
                  icon={Zap}
                  onClick={handleCompress}
                  disabled={isLoading}
                  isLoading={isLoading}
                  loadingText="Compressing..."
                  fullWidth
                >
                  Compress GIF
                </ToolActionButton>
              </div>


              {isLoading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{progressMessage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </ToolPageLayout>
  );
}

export default GifCompressor;
