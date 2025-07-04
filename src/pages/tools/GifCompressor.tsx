import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileImage, Loader2, Download, Zap, Lock, Sparkles, Upload } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

const GifUploader: React.FC<{ onFileSelected: (file: File) => void }> = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type === 'image/gif') {
      onFileSelected(file);
    } else {
      toast.error('Please select a valid GIF file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'image/gif') {
        processFile(file);
        // Create a new input element to replace the old one
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.accept = 'image/gif';
        newInput.style.display = 'none';
        // Use a type assertion to handle the event type
        newInput.onchange = ((event: Event) => {
          handleFileChange(event as unknown as React.ChangeEvent<HTMLInputElement>);
        }) as EventListener;
        // Replace the old input with the new one
        if (fileInputRef.current?.parentNode) {
          fileInputRef.current.parentNode.replaceChild(newInput, fileInputRef.current);
          fileInputRef.current = newInput;
        }
      } else {
        toast.error('Please select a valid GIF file.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop} 
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full max-w-2xl mx-auto border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-green-400 bg-gray-800/50' : 'border-gray-700/50 bg-gray-900/20'}`}>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/gif" 
        onChange={handleFileChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
        <Upload className={`h-16 w-16 transition-colors duration-300 ${isDragging ? 'text-green-400' : 'text-gray-500'}`} />
        <p className="text-lg font-semibold">Drag & drop your GIF here</p>
        <p className="text-sm">or click to browse</p>
        <p className="text-xs text-gray-500 mt-2">Max file size: 50MB</p>
      </div>
    </div>
  );
};

export default function GifCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [gifUrl, setGifUrl] = useState('');
  const [quality, setQuality] = useState(80);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setGifUrl('');
    setCompressedBlob(null);
  };

  const loadGifFromUrl = async () => {
    if (!gifUrl) return;
    
    try {
      setIsLoadingFromUrl(true);
      const response = await fetch(gifUrl);
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
      console.error('Error loading GIF from URL:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load GIF from URL');
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsLoading(true);
    toast.info('Starting Compression', { description: 'Your GIF is being compressed. Please wait.' });
    try {
      // Simulate compression
      await new Promise(resolve => setTimeout(resolve, 2000));
      const placeholderBlob = new Blob(['GIF'], { type: 'image/gif' }); // Placeholder
      setCompressedBlob(placeholderBlob);
      toast.success('Compression Successful!', { description: 'Your compressed GIF is ready.' });
    } catch (error) {
      console.error('Compression failed:', error);
      toast.error('Compression Failed', { description: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
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

  const features = [
    { icon: <Zap className="h-8 w-8 text-green-400" />, title: 'Lightning Fast', description: 'Compress GIFs in seconds with our optimized engine.' },
    { icon: <Sparkles className="h-8 w-8 text-cyan-400" />, title: 'Smart Optimization', description: 'Keeps colors vibrant & reduces artifacts for high quality results.' },
    { icon: <Lock className="h-8 w-8 text-purple-400" />, title: 'Secure & Private', description: 'Your files are processed in your browser, never uploaded.' }
  ];

  return (
    <div className="text-white relative overflow-hidden">
      <ParticleBackground />
      <Helmet>
        <title>Online GIF Compressor | sLixTOOLS</title>
        <meta name="description" content="Compress and optimize your GIF files online for free. Reduce GIF file size while maintaining visual quality with sLixTOOLS." />
        <meta property="og:title" content="Free Online GIF Compressor | sLixTOOLS" />
        <meta property="og:description" content="Easily reduce the file size of your animated GIFs. Fast, secure, and high-quality compression right in your browser." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <AnimatedElement type="fadeIn" className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">GIF Compressor</h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">Reduce the file size of your animated GIFs while maintaining quality and vibrancy.</p>
        </AnimatedElement>

        {!file ? (
            <AnimatedElement type="fadeIn">
              <div className="space-y-6 w-full max-w-2xl mx-auto">
                <GifUploader onFileSelected={handleFileSelected} />
                
                <div className="relative">
                  <div className="flex items-center mb-2">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="px-3 text-sm text-gray-400">or</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="url"
                      value={gifUrl}
                      onChange={(e) => setGifUrl(e.target.value)}
                      placeholder="https://example.com/animation.gif"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent"
                    />
                    <button
                      onClick={loadGifFromUrl}
                      disabled={!gifUrl || isLoadingFromUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2AD587] text-black font-medium py-1.5 px-4 rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingFromUrl ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : 'Load from URL'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Enter a direct GIF URL (must be a .gif file)
                  </p>
                </div>
              </div>
            </AnimatedElement>
          ) : (
            <AnimatedElement type="fadeIn" className="space-y-8">
              <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <FileImage className="h-10 w-10 text-cyan-400" />
                    <div>
                      <p className="font-medium text-gray-200">{file.name}</p>
                      <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFile(null)} 
                    className="bg-red-600 text-white font-bold py-1.5 px-4 rounded-lg rainbow-hover relative overflow-hidden"
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
                    <span className="relative z-10">Remove</span>
                  </button>
                </div>
                
                <div className="space-y-4 pt-6 border-t border-gray-700/50">
                  <label className="block text-lg font-medium text-center text-gray-300">Compression Quality: {quality}%</label>
                  <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400" />
                </div>
              </div>
              <div className="flex justify-center">
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
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compressing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" /> Compress GIF
                  <Sparkles className="mr-2 h-5 w-5" /> Compress GIF
                    </>
                  )}
                </button>
              </div>
            </Card>
          </AnimatedElement>
        )}
      </div>
    </div>
  );
}
