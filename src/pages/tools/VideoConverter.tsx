import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { FileVideo, Download, Settings, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { validateVideoFile } from '@/utils/fileValidation';
import { compressVideo } from '@/utils/videoProcessor';
import AnimatedElement from '@/components/AnimatedElement';
import ParticleBackground from '@/components/ParticleBackground';

interface ConversionOptions {
  format: string;
  quality: number;
  resolution?: string;
  frameRate?: number;
  audioBitrate?: number;
  videoBitrate?: number;
}

const VideoConverter: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [convertedVideo, setConvertedVideo] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState<ConversionOptions>({
    format: 'mp4',
    quality: 23,
    resolution: 'original',
    frameRate: 30,
    audioBitrate: 128,
    videoBitrate: 1000
  });
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [convertedUrl, setConvertedUrl] = useState<string>('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid video file');
      return;
    }

    setVideoFile(file);
    setConvertedVideo(null);
    setConvertedUrl('');
    
    // Create preview URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    toast.success('Video file loaded successfully!');
  }, [videoUrl]);

  const handleConvert = useCallback(async () => {
    if (!videoFile) {
      toast.error('Please select a video file first');
      return;
    }

    setIsConverting(true);
    setProgress(0);

    try {
      const result = await compressVideo(
        videoFile,
        {
          quality: options.quality,
          format: options.format as 'mp4' | 'webm' | 'avi',
          resolution: options.resolution !== 'original' ? options.resolution : undefined,
          frameRate: options.frameRate,
          audioBitrate: options.audioBitrate,
          videoBitrate: options.videoBitrate
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      setConvertedVideo(result);
      
      // Create download URL
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
      const url = URL.createObjectURL(result);
      setConvertedUrl(url);
      
      toast.success('Video converted successfully!');
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert video. Please try again.');
    } finally {
      setIsConverting(false);
    }
  }, [videoFile, options, convertedUrl]);

  const handleDownload = useCallback(() => {
    if (!convertedVideo || !videoFile) return;

    const link = document.createElement('a');
    link.href = convertedUrl;
    link.download = `${videoFile.name.split('.')[0]}_converted.${options.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started!');
  }, [convertedVideo, convertedUrl, videoFile, options.format]);

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    };
  }, [videoUrl, convertedUrl]);

  return (
    <div className="text-white relative min-h-screen">
      <ParticleBackground />
      <Helmet>
        <title>Video Converter - sLixTOOLS</title>
        <meta name="description" content="Convert videos between different formats like MP4, WebM, and AVI with customizable quality settings." />
        <link rel="canonical" href="https://slixtools.io/tools/video-converter" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Video Converter
              </h1>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Convert your videos between different formats with customizable quality and compression settings.
                All processing happens in your browser for maximum privacy.
              </p>
            </div>
          </AnimatedElement>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <AnimatedElement type="slideUp" delay={0.4}>
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileVideo className="h-5 w-5" />
                    Upload Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <FileVideo className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-300 mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">Supports MP4, WebM, AVI, MOV, and more</p>
                    </label>
                  </div>
                  
                  {videoFile && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <strong>File:</strong> {videoFile.name}
                      </p>
                      <p className="text-sm text-gray-300">
                        <strong>Size:</strong> {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      {videoUrl && (
                        <video
                          src={videoUrl}
                          controls
                          className="w-full rounded-lg mt-4"
                          style={{ maxHeight: '200px' }}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedElement>

            {/* Conversion Options */}
            <AnimatedElement type="slideUp" delay={0.6}>
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5" />
                    Conversion Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Output Format</Label>
                    <Select value={options.format} onValueChange={(value) => setOptions(prev => ({ ...prev, format: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="mp4">MP4</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="avi">AVI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Quality (CRF: {options.quality})</Label>
                    <Slider
                      value={[options.quality]}
                      onValueChange={([value]) => setOptions(prev => ({ ...prev, quality: value }))}
                      min={18}
                      max={35}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-400">Lower values = higher quality, larger file size</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Resolution</Label>
                    <Select value={options.resolution} onValueChange={(value) => setOptions(prev => ({ ...prev, resolution: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="1920x1080">1080p</SelectItem>
                        <SelectItem value="1280x720">720p</SelectItem>
                        <SelectItem value="854x480">480p</SelectItem>
                        <SelectItem value="640x360">360p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Frame Rate: {options.frameRate} fps</Label>
                    <Slider
                      value={[options.frameRate || 30]}
                      onValueChange={([value]) => setOptions(prev => ({ ...prev, frameRate: value }))}
                      min={15}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Button
                    onClick={handleConvert}
                    disabled={!videoFile || isConverting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isConverting ? 'Converting...' : 'Convert Video'}
                  </Button>

                  {isConverting && (
                    <div className="space-y-2">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-gray-400 text-center">{progress.toFixed(1)}% complete</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedElement>
          </div>

          {/* Result Section */}
          {convertedVideo && (
            <AnimatedElement type="fadeIn" delay={0.8}>
              <Card className="bg-gray-800/50 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Download className="h-5 w-5" />
                    Converted Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-300 mb-2">
                        <strong>Original:</strong> {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-gray-300 mb-4">
                        <strong>Converted:</strong> {(convertedVideo.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-green-400">
                        Size reduction: {(((videoFile!.size - convertedVideo.size) / videoFile!.size) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  {convertedUrl && (
                    <video
                      src={convertedUrl}
                      controls
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                  )}
                </CardContent>
              </Card>
            </AnimatedElement>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoConverter;