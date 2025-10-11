import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileImage, Loader2, Download, Zap } from 'lucide-react';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import { compressGif, getOptimalCompressionSettings, type CompressionProgress } from '@/utils/gifCompressor';
import { formatFileSizeMB } from '@/utils/formatters';
import { useLoading } from '@/hooks';
import { EXTERNAL_URLS } from '@/config/externalUrls';

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

  const handleUrlSubmit = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load GIF from URL');
      
      const blob = await response.blob();
      if (!blob.type.includes('gif')) {
        throw new Error('The URL does not point to a valid GIF');
      }
      
      const file = new File([blob], 'gif-from-url.gif', { type: 'image/gif' });
      setFile(file);
      setCompressedBlob(null);
      toast.success('GIF loaded from URL');
    } catch (error) {
      // Error details are logged to error reporting system
      toast.error(error instanceof Error ? error.message : 'Failed to load GIF from URL');
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    
    setProgress(0);
    setProgressMessage('Starting compression...');
    toast.info('Starting Compression', { description: 'Your GIF is being compressed. Please wait.' });
    
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
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sLixTOOLS-compressed-${file?.name || 'image.gif'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPageLayout
      title="GIF Compressor"
      description="Reduce the file size of your animated GIFs while maintaining quality and vibrancy."
      keywords="gif compressor, gif optimizer, reduce gif size, compress animated gif, gif file size reducer"
      canonicalUrl="/tools/gif-compressor"
      pageTitle="Online GIF Compressor | sLixTOOLS"
      pageDescription="Compress and optimize your GIF files online for free. Reduce GIF file size while maintaining visual quality with sLixTOOLS."
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
        />
      ) : (
        <div className="space-y-8">
          <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <FileImage className="h-10 w-10 text-green-400" />
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
                <div className="mb-6 p-4 bg-green-400/10 border border-green-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 font-medium">Compression Complete!</p>
                      <p className="text-sm text-gray-300">
                        Original: {(file.size / 1024).toFixed(2)} KB → 
                        Compressed: {(compressedBlob.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button 
                      onClick={handleDownload}
                      className="bg-green-400 text-black hover:bg-green-500"
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
                    {(['standard', 'gifsicle', 'lossy'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setCompressionMethod(method)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          compressionMethod === method
                            ? 'border-green-400 bg-green-400/10 text-green-400'
                            : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium capitalize">{method}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {method === 'standard' && 'Balanced quality & size'}
                          {method === 'gifsicle' && 'Maximum compression'}
                          {method === 'lossy' && 'Smallest file size'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {compressionMethod === 'standard' && (
                  <div className="space-y-4 p-4 bg-blue-400/5 rounded-lg border border-blue-400/20">
                    <h4 className="text-sm font-medium text-blue-400">Standard Compression Options</h4>
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
                  <div className="space-y-4 p-4 bg-green-400/5 rounded-lg border border-green-400/20">
                    <h4 className="text-sm font-medium text-green-400">Gifsicle Compression Options</h4>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Optimization Level: {optimizationLevel}</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        value={optimizationLevel} 
                        onChange={(e) => setOptimizationLevel(parseInt(e.target.value))} 
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400" 
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
                    <h4 className="text-sm font-medium text-purple-400">Lossy Compression Options</h4>
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

              <div className="flex justify-center mt-6">
                <button 
                  onClick={handleCompress}
                  disabled={isLoading}
                  className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover w-full md:w-auto flex items-center justify-center"
                  style={{
                    outline: 'none',
                    border: 'none',
                    WebkitAppearance: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Compress GIF
                    </>
                  )}
                </button>
              </div>
                
              {isLoading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{progressMessage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-300"
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
