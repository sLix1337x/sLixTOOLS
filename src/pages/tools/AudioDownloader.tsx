import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, Music, Youtube, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

type ServiceType = 'youtube' | 'soundcloud';
type FormatType = 'mp3' | 'flac';

const AudioDownloader: React.FC = () => {
  const [url, setUrl] = useState('');
  const [service, setService] = useState<ServiceType>('youtube');
  const [format, setFormat] = useState<FormatType>('mp3');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    thumbnail: string;
    duration: string;
  } | null>(null);

  const handleDownload = async () => {
    if (!url) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      setIsLoading(true);
      
      // In a real implementation, you would call your backend API here
      // For now, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      const simulatedResponse = {
        success: true,
        downloadUrl: 'https://example.com/download',
        info: {
          title: 'Sample Audio Track',
          thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          duration: '3:45'
        }
      };
      
      setDownloadUrl(simulatedResponse.downloadUrl);
      setVideoInfo(simulatedResponse.info);
      
      toast.success('Audio is ready to download!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to process the audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setDownloadUrl(null);
    setVideoInfo(null);
  };

  const handleServiceChange = (value: string) => {
    setService(value as ServiceType);
    resetForm();
  };

  const handleFormatChange = (value: string) => {
    setFormat(value as FormatType);
  };

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>Audio Downloader | sLixTOOLS</title>
        <meta name="description" content="Download audio from YouTube and SoundCloud in MP3 or FLAC format. Fast, free, and easy to use." />
        <meta name="keywords" content="youtube downloader, soundcloud downloader, mp3 downloader, flac downloader, audio downloader" />
        <link rel="canonical" href="https://slixtools.io/tools/audio-downloader" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Audio Downloader
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Download high-quality audio from YouTube and SoundCloud in MP3 or FLAC format.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.6} className="space-y-6">
            <Card className="p-6 border border-gray-700/50 bg-gray-900/20">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="service" className="text-sm font-medium text-gray-300">
                      Source
                    </label>
                    <div className="w-48">
                      <Select value={service} onValueChange={handleServiceChange}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="youtube" className="hover:bg-gray-700 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <Youtube className="h-4 w-4 text-red-500" />
                              <span>YouTube</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="soundcloud" className="hover:bg-gray-700 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <Music className="h-4 w-4 text-orange-500" />
                              <span>SoundCloud</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="format" className="text-sm font-medium text-gray-300">
                      Format
                    </label>
                    <div className="w-48">
                      <Select value={format} onValueChange={handleFormatChange}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="mp3" className="hover:bg-gray-700 cursor-pointer">
                            MP3 (Standard Quality)
                          </SelectItem>
                          <SelectItem value="flac" className="hover:bg-gray-700 cursor-pointer">
                            FLAC (Lossless)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {!downloadUrl ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex items-center">
                        <div className="absolute left-3">
                          <Link2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder={`Paste ${service === 'youtube' ? 'YouTube' : 'SoundCloud'} URL here`}
                          className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleDownload}
                      disabled={!url || isLoading}
                      className="w-full bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center disabled:opacity-70"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" /> Download Audio
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4 p-4 bg-gray-800/30 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="h-16 w-16 rounded overflow-hidden">
                          <img 
                            src={videoInfo?.thumbnail} 
                            alt="Thumbnail" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-white truncate">
                          {videoInfo?.title || 'Audio Track'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {service === 'youtube' ? 'YouTube' : 'SoundCloud'} • {format.toUpperCase()} • {videoInfo?.duration || '--:--'}
                        </p>
                      </div>
                      <button 
                        onClick={resetForm}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Clear"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        asChild
                        className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity"
                      >
                        <a href={downloadUrl} download>
                          <Download className="h-5 w-5" />
                          <span>Download {format.toUpperCase()}</span>
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-800/50 transition-colors"
                        onClick={resetForm}
                      >
                        <span>Convert Another</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <AnimatedElement type="fadeIn" delay={0.8} className="mt-8">
              <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
                  <Download className="mr-2 h-5 w-5 text-green-400" />
                  How to use
                </h3>
                <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                  <li>Select the source (YouTube or SoundCloud)</li>
                  <li>Choose your preferred audio format (MP3 or FLAC)</li>
                  <li>Paste the URL of the video or track you want to download</li>
                  <li>Click "Download Audio" and wait for processing</li>
                  <li>Download your audio file when ready</li>
                </ol>
                <p className="mt-4 text-xs text-gray-500">
                  <span className="font-semibold">Note:</span> Please respect copyright and only download content you have the rights to use.
                </p>
              </div>
            </AnimatedElement>
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
};

export default AudioDownloader;
