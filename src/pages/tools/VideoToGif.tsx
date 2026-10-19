import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Wand2, PartyPopper } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ConversionOptions as ConversionOptionsType,
  VideoPreviewProps,
  GifPreviewProps,
} from '@/types';
import PostConversionOptions from '@/components/PostConversionOptions';
import ConversionOptionsComponent from '@/components/ConversionOptions';
import ToolPageLayout from '@/components/ToolPageLayout';
import Divider from '@/components/ui/divider';
import FileUploadArea from '@/components/FileUploadArea';
import { convertVideoToGif } from '@/utils/gifConverter';
import AnimatedElement from '@/components/AnimatedElement';
import { useToolErrorHandler, useUrlFileLoader } from '@/hooks';
import { validateFile } from '@/utils/fileValidation';
import { downloadBlobWithGeneratedName } from '@/utils/download';
import ToolActionButton from '@/components/tools/ToolActionButton';

// Interface definitions
interface GifResult {
  url: string;
  blob: Blob;
  size: number;
  processingTime: number;
}

import { config } from '@/config';

// Configuration constants
const CONFIG = {
  MAX_FILE_SIZE: config.upload.maxFileSize, // Use centralized config
  // Any video MIME: real files report quicktime/x-matroska/x-msvideo, not the pretty names
  SUPPORTED_FORMATS: ['video/*'],
  DEFAULT_OPTIONS: {
    fps: 15,
    quality: 10, // gif.js sample interval (slider 1-20, lower = better)
    trimEnabled: true,
  },
  DEFAULT_DIMENSIONS: {
    width: 480,
    height: 360,
  },
} as const;

// Sub-components defined in the same file for simplicity, but can be moved to separate files

const VideoPreview = React.memo<VideoPreviewProps>(({ file, onDurationChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !file) return;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    // Recorded WebM can report Infinity; keep the duration from file selection instead
    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration)) onDurationChange?.(video.duration);
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      URL.revokeObjectURL(videoUrl);
    };
  }, [file, onDurationChange]);

  if (!file) return null;
  return (
    <div className="w-full max-w-2xl mx-auto">
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg shadow-lg border border-gray-700/50"
      />
    </div>
  );
});

const GifPreview = React.memo<GifPreviewProps>(({ gifBlob, onDownload, isConverting }) => {
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  useEffect(() => {
    if (gifBlob) {
      const url = URL.createObjectURL(gifBlob);
      setGifUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setGifUrl(null);
    }
    // Return undefined for the case where no cleanup is needed
    return undefined;
  }, [gifBlob]);

  if (!gifBlob || !gifUrl) return null;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <img
        src={gifUrl}
        alt="Generated GIF"
        className="w-full rounded-lg shadow-lg mb-4 border border-gray-700/50"
        loading="lazy"
        decoding="async"
        style={{ contentVisibility: 'auto' }}
      />
      <ToolActionButton icon={Download} onClick={onDownload} disabled={isConverting}>
        Download GIF
      </ToolActionButton>
    </div>
  );
});

// Main Component
const VideoToGif = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifResult, setGifResult] = useState<GifResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptionsType>({
    fps: CONFIG.DEFAULT_OPTIONS.fps,
    quality: CONFIG.DEFAULT_OPTIONS.quality,
    trimEnabled: CONFIG.DEFAULT_OPTIONS.trimEnabled,
    startTime: 0,
    endTime: 0,
    duration: 0,
  });

  // Cleanup URLs on component unmount or when gifResult changes
  useEffect(() => {
    return () => {
      if (gifResult?.url) {
        URL.revokeObjectURL(gifResult.url);
      }
    };
  }, [gifResult]);

  // Use centralized error handler
  const { handleError } = useToolErrorHandler({
    componentName: 'VideoToGif',
    showToast: true,
    showDetailsAction: true,
  });

  const handleFileSelected = useCallback(
    (file: File) => {
      try {
        // Use centralized validation function
        const validation = validateFile(file, {
          maxFileSize: CONFIG.MAX_FILE_SIZE,
          supportedFormats: CONFIG.SUPPORTED_FORMATS,
        });

        if (!validation.isValid) {
          throw new Error(validation.error || 'File validation failed');
        }

        // Show warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => {
            toast.warning('File Warning', {
              description: warning,
            });
          });
        }

        setVideoFile(file);
        setGifBlob(null);
        setGifResult(null);
        setShowPostOptions(false);

        // Get video duration for trim options
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          try {
            if (video.duration === 0 || !isFinite(video.duration)) {
              throw new Error('Invalid video duration detected');
            }

            const duration = video.duration;
            setVideoDuration(duration);
            // Set default end time to 5 seconds or video duration if shorter
            const defaultEndTime = Math.min(5, duration);
            setConversionOptions((prev) => ({
              ...prev,
              endTime: defaultEndTime,
              duration: duration,
            }));
          } catch (error) {
            handleError(
              error instanceof Error ? error : new Error(String(error)),
              'Video metadata extraction',
              {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
              }
            );
          } finally {
            window.URL.revokeObjectURL(video.src);
          }
        };

        video.onerror = () => {
          window.URL.revokeObjectURL(video.src);
          handleError(
            new Error(
              'Failed to load video file. The file may be corrupted or in an unsupported format.'
            ),
            'Video file validation',
            {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            }
          );
        };
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)), 'File validation', {
          fileName: file?.name,
          fileSize: file?.size,
          fileType: file?.type,
        });
      }
    },
    [handleError]
  );

  // Use centralized URL file loader
  const { loadFromUrl } = useUrlFileLoader({
    expectedType: 'video',
    maxFileSize: CONFIG.MAX_FILE_SIZE,
    onSuccess: handleFileSelected,
  });

  const handleUrlSubmit = useCallback(
    async (url: string) => {
      await loadFromUrl(url);
    },
    [loadFromUrl]
  );

  const handlePostEdit = useCallback(
    (editType: string) => {
      if (!gifResult) return;

      // ponytail: no GIF post-editing pipeline exists yet; say so instead of faking success
      toast.info(`${editType} is not available yet`, {
        description: 'Download the GIF and use the GIF Compressor or Image tools for now.',
      });
    },
    [gifResult]
  );

  const resetVideo = () => {
    setVideoFile(null);
    setVideoDuration(0);
    setGifBlob(null);
    setGifResult(null);
    setShowPostOptions(false);
    setProgress(0);
  };

  const handleDownload = useCallback(() => {
    if (gifBlob) {
      downloadBlobWithGeneratedName(gifBlob, 'converted', videoFile?.name, 'gif', {
        showToast: true,
      });
    }
  }, [gifBlob, videoFile]);

  const handleConvert = async () => {
    if (!videoFile) return;

    // Check file size before conversion
    if (videoFile.size > CONFIG.MAX_FILE_SIZE) {
      handleError(
        new Error(
          `File size (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`
        ),
        'File size validation failed',
        {
          fileName: videoFile.name,
          fileSize: videoFile.size,
          fileType: videoFile.type,
        }
      );
      return;
    }

    setIsConverting(true);
    setProgress(0);
    setGifResult(null);
    setShowPostOptions(false);

    try {
      const startTime = performance.now();
      const gifBlob = await convertVideoToGif(
        videoFile,
        {
          fps: conversionOptions.fps,
          quality: conversionOptions.quality,
          startTime: conversionOptions.trimEnabled ? conversionOptions.startTime : 0,
          duration:
            conversionOptions.trimEnabled && conversionOptions.endTime
              ? conversionOptions.endTime - conversionOptions.startTime
              : videoDuration,
          trimEnabled: conversionOptions.trimEnabled,
          width: conversionOptions.width ?? 0, // 0 = auto
          height: conversionOptions.height ?? 0,
        },
        (progress) => setProgress(progress.progress / 100)
      );
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      setGifBlob(gifBlob);

      // Create GIF result with metadata
      const gifUrl = URL.createObjectURL(gifBlob);
      setGifResult({
        url: gifUrl,
        blob: gifBlob,
        size: gifBlob.size,
        processingTime,
      });
      setShowPostOptions(true);

      const fileSizeMB = (gifBlob.size / 1024 / 1024).toFixed(2);
      toast.success('Conversion Successful!', {
        description: `File size: ${fileSizeMB}MB (${processingTime}ms)`,
      });
    } catch (conversionError) {
      handleError(
        conversionError instanceof Error ? conversionError : new Error(String(conversionError)),
        'Video conversion',
        {
          fileName: videoFile.name,
          fileSize: videoFile.size,
          options: JSON.stringify(conversionOptions),
        }
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <ToolPageLayout
      title="Video to GIF Converter"
      description="Convert MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files to animated GIFs online."
      keywords="video to gif, mp4 to gif, webm to gif, avi to gif, convert video to gif, gif maker, online gif converter"
      canonicalUrl="/tools/video-to-gif"
      pageTitle="Video to GIF Converter | sLixTOOLS"
      pageDescription="Convert MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files to animated GIFs online. Fast, free, and secure video to GIF conversion."
      breadcrumbLabel="Video to GIF"
      faq={[
        {
          question: 'Is my video uploaded to a server?',
          answer: 'No. The conversion runs entirely in your browser using WebAssembly, so your video never leaves your device.',
        },
        {
          question: 'Which video formats can I convert?',
          answer: 'MP4, WebM, AVI, MOV, MKV, FLV, WMV, OGG, M4V, 3GP and most other common formats are supported.',
        },
        {
          question: 'How can I make the GIF file smaller?',
          answer: 'Lower the frame rate and width, reduce the duration by trimming, or use the GIF Compressor tool afterwards for further optimization.',
        },
      ]}
    >
      {!videoFile ? (
        <FileUploadArea
          acceptedTypes={[...CONFIG.SUPPORTED_FORMATS]}
          maxFileSize={CONFIG.MAX_FILE_SIZE}
          onFileSelected={handleFileSelected}
          onUrlSubmit={handleUrlSubmit}
          showUrlInput={true}
          urlPlaceholder="https://example.com/video.mp4"
          fileCategory="video"
          title="Drag & drop your video here"
          description="or click to browse"
        />
      ) : (
        <div className="space-y-6">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <VideoPreview file={videoFile} onDurationChange={setVideoDuration} />
            <div className="flex justify-between items-center max-w-2xl mx-auto mt-2 text-sm text-gray-400">
              <span className="truncate" title={videoFile.name}>{videoFile.name}</span>
              <Button
                onClick={resetVideo}
                variant="outline"
                size="sm"
                disabled={isConverting}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Remove
              </Button>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.4}>
            <ConversionOptionsComponent
              options={conversionOptions}
              onChange={setConversionOptions}
              videoDuration={videoDuration}
              videoFile={videoFile}
            />
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.6}>
            <div className="flex justify-center">
              <ToolActionButton
                icon={Wand2}
                onClick={handleConvert}
                disabled={isConverting}
                isLoading={isConverting}
                loadingText="Converting..."
                fullWidth
              >
                Convert to GIF
              </ToolActionButton>
              <div id="conversion-description" className="sr-only">
                Click to start converting your video file to an animated GIF
              </div>
            </div>
          </AnimatedElement>

          {isConverting && (
            <AnimatedElement type="fadeIn" delay={0.2}>
              <div
                className="max-w-md mx-auto space-y-3"
                id="conversion-progress"
                role="status"
                aria-live="polite"
              >
                <div className="text-center">
                  <p className="text-sm text-gray-300 mb-2">Converting your video to GIF...</p>
                  <Progress
                    value={progress * 100}
                    className="h-2 bg-gray-700"
                    aria-label={`Conversion progress: ${Math.round(progress * 100)}% complete`}
                  />
                  <p
                    className="text-xs text-gray-400 mt-1"
                    aria-label={`Progress: ${Math.round(progress * 100)} percent complete`}
                  >
                    {Math.round(progress * 100)}% complete
                  </p>
                </div>
              </div>
            </AnimatedElement>
          )}

          {showPostOptions && gifResult && (
            <AnimatedElement type="fadeIn" delay={0.2}>
              <PostConversionOptions
                gifResult={gifResult}
                onDownload={handleDownload}
                onEdit={handlePostEdit}
              />
            </AnimatedElement>
          )}

          {gifBlob && !showPostOptions && (
            <AnimatedElement type="fadeIn" delay={0.2}>
              <div className="mt-8">
                <Divider className="mb-6" />
                <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent flex items-center justify-center gap-2.5">
                  <PartyPopper className="h-6 w-6 text-sky-400 flex-shrink-0" aria-hidden="true" />
                  Your GIF is Ready!
                </h2>
                <GifPreview
                  gifBlob={gifBlob}
                  onDownload={handleDownload}
                  isConverting={isConverting}
                />
              </div>
            </AnimatedElement>
          )}
        </div>
      )}
    </ToolPageLayout>
  );
};

export default VideoToGif;
