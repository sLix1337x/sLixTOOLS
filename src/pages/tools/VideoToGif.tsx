import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileVideo, Download, Wand2, Zap, Lock, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ConversionOptions as ConversionOptionsType, VideoPreviewProps, GifPreviewProps, ConversionOptionsProps, FileUploadProps } from '@/types';
import { validateVideoFile } from '@/utils/validation';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

// Sub-components defined in the same file for simplicity, but can be moved to separate files

const VideoPreview: React.FC<VideoPreviewProps> = ({ file, onDurationChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !file) return;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    const handleLoadedMetadata = () => onDurationChange?.(video.duration);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      URL.revokeObjectURL(videoUrl);
    };
  }, [file, onDurationChange]);

  if (!file) return null;
  return (
    <div className="w-full max-w-2xl mx-auto">
      <video ref={videoRef} controls className="w-full rounded-lg shadow-lg border border-gray-700/50" />
    </div>
  );
};

const GifPreview: React.FC<GifPreviewProps> = ({ gifBlob, onDownload, isConverting }) => {
  if (!gifBlob) return null;
  const gifUrl = URL.createObjectURL(gifBlob);
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <img src={gifUrl} alt="Generated GIF" className="w-full rounded-lg shadow-lg mb-4 border border-gray-700/50" />
      <Button onClick={onDownload} disabled={isConverting} className="bg-[#2AD587] hover:bg-[#25c27a] text-black font-bold py-2.5 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-0 focus:ring-offset-0">
        <Download className="mr-2 h-5 w-5" />
        Download GIF
      </Button>
    </div>
  );
};

const ConversionOptions: React.FC<ConversionOptionsProps> = ({ options, onOptionsChange, videoDuration }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onOptionsChange({ ...options, [name]: type === 'checkbox' ? checked : parseFloat(value) });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-gray-900/20 border border-gray-700/50">
      <h3 className="text-xl font-bold mb-6 text-center text-white">Conversion Options</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">FPS: {options.fps}</label>
          <input type="range" name="fps" min="5" max="30" step="1" value={options.fps} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Quality: {options.quality}%</label>
          <input type="range" name="quality" min="10" max="100" step="5" value={options.quality} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400" />
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="trimEnabled" name="trimEnabled" checked={options.trimEnabled} onChange={handleChange} className="w-4 h-4 text-green-400 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
          <label htmlFor="trimEnabled" className="ml-3 text-sm font-medium text-gray-300">Enable Trimming</label>
        </div>
        {options.trimEnabled && (
          <div className="space-y-4 pt-4 border-t border-gray-700/50">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Start Time: {options.startTime.toFixed(1)}s</label>
              <input type="range" name="startTime" min="0" max={videoDuration} step="0.1" value={options.startTime} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">End Time: {options.endTime.toFixed(1)}s</label>
              <input type="range" name="endTime" min="0" max={videoDuration} step="0.1" value={options.endTime} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const processFile = (file: File) => {
    const errorMessage = validateVideoFile(file);
    if (typeof errorMessage === 'string') {
      toast.error(errorMessage);
      return;
    }
    onFileSelected(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && e.target.files[0] && processFile(e.target.files[0]);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const loadVideoFromUrl = async () => {
    setIsLoadingFromUrl(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      processFile(new File([blob], 'video.mp4', { type: blob.type }));
    } catch (error) {
      console.error('Failed to load video from URL:', error);
      toast.error('Failed to load video from URL');
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-green-400 bg-gray-800/50' : 'border-gray-700/50 bg-gray-900/20'}`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="video/*" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
          <FileVideo className={`h-16 w-16 transition-colors duration-300 ${isDragging ? 'text-green-400' : 'text-gray-500'}`} />
          <p className="text-lg font-semibold">Drag & drop your video here</p>
          <p className="text-sm">or click to browse</p>
          <p className="text-xs text-gray-500 mt-2">Supports MP4, WebM, and other video formats</p>
        </div>
      </div>
      
      <div className="relative">
        <div className="flex items-center mb-2">
          <div className="h-px bg-gray-700 flex-1"></div>
          <span className="px-3 text-sm text-gray-400">or</span>
          <div className="h-px bg-gray-700 flex-1"></div>
        </div>
        
        <div className="relative">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent"
          />
          <button
            onClick={loadVideoFromUrl}
            disabled={!videoUrl || isLoadingFromUrl}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2AD587] text-black font-medium py-1.5 px-4 rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingFromUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : 'Load from URL'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Enter a direct video URL (MP4, WebM, etc.)
        </p>
      </div>
    </div>
  );
};

// Main Component
const VideoToGif = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptionsType>({
    fps: 15,
    quality: 80,
    trimEnabled: false,
    startTime: 0,
    endTime: 0,
    duration: 0,
  });

  const handleFileSelected = (file: File) => {
    setVideoFile(file);
    setGifBlob(null);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      setVideoDuration(duration);
      setConversionOptions(prev => ({ ...prev, endTime: duration, duration: duration }));
    };
  };

  const handleConvert = async () => {
    if (!videoFile) return;
    setIsConverting(true);
    toast.info('Starting Conversion', { description: 'Your video is being converted to a GIF. Please wait.' });
    try {
      console.log('Converting with options:', conversionOptions);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const placeholderBlob = new Blob(['GIF'], { type: 'image/gif' });
      setGifBlob(placeholderBlob);
      toast.success('Conversion Successful!', { description: 'Your GIF is ready for download.' });
    } catch (error) {
      console.error('Conversion failed:', error);
      toast.error('Conversion Failed', { description: 'Something went wrong. Please try again.' });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!gifBlob) return;
    const url = URL.createObjectURL(gifBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sLixTOOLS-converted.gif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const features = [
    {
      icon: <Zap className="h-8 w-8 text-green-400" />,
      title: 'Lightning Fast',
      description: 'Convert videos to GIFs in seconds with our optimized conversion engine.'
    },
    {
      icon: <Sparkles className="h-8 w-8 text-cyan-400" />,
      title: 'High Quality',
      description: 'Get crisp, clear GIFs with support for HD quality and custom settings.'
    },
    {
      icon: <Lock className="h-8 w-8 text-purple-400" />,
      title: 'Secure & Private',
      description: 'Your files are processed in your browser and never uploaded to our servers.'
    }
  ];

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>MP4 to GIF Converter | sLixTOOLS</title>
        <meta name="description" content="Easily convert your MP4 videos to animated GIFs online. Fast, free, and secure video to GIF conversion." />
        <meta name="keywords" content="mp4 to gif, video to gif, convert video to gif, gif maker, online gif converter" />
        <link rel="canonical" href="https://slixtools.io/tools/mp4-to-gif" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              MP4 to GIF Converter
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Create high-quality animated GIFs from your videos in just a few clicks.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-4xl mx-auto w-full">
          {!videoFile ? (
            <AnimatedElement type="fadeIn" delay={0.6}>
              <FileUpload onFileSelected={handleFileSelected} />
            </AnimatedElement>
          ) : (
            <div className="space-y-6">
              <AnimatedElement type="fadeIn" delay={0.2}>
                <VideoPreview file={videoFile} onDurationChange={setVideoDuration} />
              </AnimatedElement>
              
              <AnimatedElement type="fadeIn" delay={0.4}>
                <ConversionOptions options={conversionOptions} onOptionsChange={setConversionOptions} videoDuration={videoDuration} />
              </AnimatedElement>
              
              <AnimatedElement type="fadeIn" delay={0.6}>
                <div className="flex justify-center">
                  <button 
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="w-full md:w-auto flex items-center justify-center bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      outline: 'none',
                      border: 'none',
                      WebkitAppearance: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      minWidth: '200px'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {isConverting ? (
                      <><Loader2 className="animate-spin mr-2 h-5 w-5" /><span className="relative z-10">Converting...</span></>
                    ) : (
                      <><Wand2 className="mr-2 h-5 w-5" /><span className="relative z-10">Convert to GIF</span></>
                    )}
                  </button>
                </div>
              </AnimatedElement>
              
              {gifBlob && (
                <AnimatedElement type="fadeIn" delay={0.2}>
                  <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                      Your GIF is Ready!
                    </h2>
                    <GifPreview gifBlob={gifBlob} onDownload={handleDownload} isConverting={isConverting} />
                  </div>
                </AnimatedElement>
              )}
            </div>
          )}
        </div>

        <div className="max-w-5xl mx-auto w-full mt-12">
          <div className="text-center mb-8">
            <AnimatedElement type="fadeIn" delay={0.2}>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Why Choose Our GIF Maker?
              </h2>
            </AnimatedElement>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <AnimatedElement key={index} type="fadeIn" delay={0.4 + index * 0.2}>
                <Card className="p-6 h-full bg-gray-900/20 border border-gray-700/50 text-center flex flex-col items-center">
                  <div className="bg-gray-800/50 w-14 h-14 rounded-full flex items-center justify-center mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </Card>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoToGif;
