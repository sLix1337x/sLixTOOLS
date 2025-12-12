import React, { useState, useCallback, useEffect } from 'react';
import { Download, Settings2, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { validateVideoFile } from '@/utils/fileValidation';
import { compressVideo, VideoCompressionOptions } from '@/utils/videoProcessor';
import { useToolFile } from '@/hooks';
import { formatFileSizeMB } from '@/utils/formatters';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import { toast } from 'sonner';
import { downloadBlobWithGeneratedName } from '@/utils/download';

const VideoConverter = () => {
  const [convertedVideo, setConvertedVideo] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState<VideoCompressionOptions>({
    format: 'mp4',
    quality: 23,
    maxWidth: 1920,
    maxHeight: 1080,
    codec: 'h264',
    fps: 30,
    bitrate: 1000,
    maintainAspectRatio: true
  });
  const [convertedUrl, setConvertedUrl] = useState<string>('');

  const {
    file: videoFile,
    fileUrl: videoUrl,
    handleFileSelect
  } = useToolFile({
    validateFunction: validateVideoFile,
    onFileLoad: () => {
      // Reset conversion state
      setConvertedVideo(null);
      setConvertedUrl('');
    },
    onFileError: (error) => {
      toast.error('File validation error: ' + error.message);
    }
  });

  const handleConvert = useCallback(async () => {
    if (!videoFile) return;

    setIsConverting(true);
    setProgress(0);

    try {
      const result = await compressVideo(
        videoFile,
        options,
        (progressData) => setProgress(progressData.progress)
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
      toast.error('Video conversion failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsConverting(false);
    }
  }, [videoFile, options, convertedUrl]);

  const handleDownload = useCallback(() => {
    if (!convertedVideo) return;

    downloadBlobWithGeneratedName(
      convertedVideo,
      'converted',
      videoFile?.name,
      options.format,
      { showToast: true }
    );
  }, [convertedVideo, videoFile?.name, options.format]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  return (
    <ToolPageLayout
      title="Video Converter"
      description="Convert your videos between different formats with customizable quality and compression settings. All processing happens in your browser for maximum privacy."
      keywords="video converter, video compression, MP4, WebM, AVI, video format conversion"
      canonicalUrl="https://slixtools.io/tools/video-converter"
      pageTitle="Video Converter - sLixTOOLS"
      pageDescription="Convert videos between different formats like MP4, WebM, and AVI with customizable quality settings."
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileVideo className="h-5 w-5" />
              Upload Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadArea
              onFileSelected={handleFileSelect}
              acceptedTypes={['video/*']}
              fileCategory="video"
              title="Upload Video"
              description="Supports MP4, WebM, AVI, MOV, and more"
            />

            {videoFile && (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  <strong>File:</strong> {videoFile.name}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Size:</strong> {formatFileSizeMB(videoFile.size)}
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

        {/* Conversion Options */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings2 className="h-5 w-5" />
              Conversion Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Output Format</Label>
              <Select value={options.format} onValueChange={(value) => setOptions(prev => ({ ...prev, format: value as 'mp4' | 'webm' | 'avi' | 'mov' }))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                  <SelectItem value="avi">AVI</SelectItem>
                  <SelectItem value="mov">MOV</SelectItem>
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
              <Label className="text-white">Max Width</Label>
              <Slider
                value={[options.maxWidth]}
                onValueChange={([value]) => setOptions(prev => ({ ...prev, maxWidth: value }))}
                min={480}
                max={3840}
                step={160}
                className="w-full"
              />
              <p className="text-xs text-gray-400">{options.maxWidth}px</p>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Max Height</Label>
              <Slider
                value={[options.maxHeight]}
                onValueChange={([value]) => setOptions(prev => ({ ...prev, maxHeight: value }))}
                min={360}
                max={2160}
                step={120}
                className="w-full"
              />
              <p className="text-xs text-gray-400">{options.maxHeight}px</p>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Frame Rate: {options.fps} fps</Label>
              <Slider
                value={[options.fps || 30]}
                onValueChange={([value]) => setOptions(prev => ({ ...prev, fps: value }))}
                min={15}
                max={60}
                step={5}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleConvert}
              disabled={!videoFile || isConverting}
              className="w-full bg-primary-action hover:bg-primary-action/90 shadow-[0_0_15px_rgba(42,213,135,0.5)] hover:shadow-[0_0_25px_rgba(42,213,135,0.7)] transition-shadow duration-300"
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
      </div>

      {/* Result Section */}
      {convertedVideo && (
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
      )}
    </ToolPageLayout>
  );
};

export default VideoConverter;