import { useState, useCallback } from 'react';
import { Clapperboard, Download, Gauge, Scaling, TriangleAlert, Wand2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ConversionOptions as ConversionOptionsType } from '@/types';
import ConversionOptionsComponent from '@/components/ConversionOptions';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { convertVideoToGif } from '@/utils/gifConverter';
import { useObjectUrl, useToolErrorHandler, useUrlFileLoader } from '@/hooks';
import { validateFile } from '@/utils/fileValidation';
import { downloadBlobWithGeneratedName } from '@/utils/download';
import { formatFileSize } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { config } from '@/config';
import {
  chipButton,
  guideCard,
  guideHeading,
  primaryButton,
  segmentButton,
  segmentGroup,
  settingsColumn,
  settingsGrid,
  statusRow,
  toolDropzone,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';

const PREVIEW_MODES = ['Video', 'GIF'] as const;

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <Clapperboard className="h-5 w-5" aria-hidden="true" />
      </span>
      Making Better GIFs
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Gauge className="h-5 w-5" aria-hidden="true" />
          What Drives File Size
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Frame rate:', '10 to 15 fps is enough for most clips. Twice the frames means about twice the size.')}
          {guideItem('Width:', 'half the width leaves a quarter of the pixels, the biggest saving there is.')}
          {guideItem('Length:', 'every second adds frames, so trim to the moment you need.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Scaling className="h-5 w-5" aria-hidden="true" />
          Size and Clip
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Auto size:', 'keeps the video size. The longest side stops at 800 px.')}
          {guideItem('One side:', 'set only width or height, the other follows the aspect ratio.')}
          {guideItem('Clip:', 'the first 5 seconds are selected. Clear End to run to the end of the video.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          Good to Know
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Limits:', 'up to 100 MB per video and 30 seconds per GIF.')}
          {guideItem('Formats:', 'anything your browser can play. MP4 and WebM are the safest.')}
          {guideItem('Estimate:', 'based on a short sample from the middle of the clip. The status bar shows the real size.')}
          {guideItem('Still too big?', 'run the result through the GIF Compressor.')}
        </ul>
      </section>
    </div>
  </div>
);

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

// Main Component
const VideoToGif = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptionsType>({
    fps: CONFIG.DEFAULT_OPTIONS.fps,
    quality: CONFIG.DEFAULT_OPTIONS.quality,
    trimEnabled: CONFIG.DEFAULT_OPTIONS.trimEnabled,
    startTime: 0,
    endTime: 0,
    duration: 0,
  });
  const videoUrl = useObjectUrl(videoFile);
  const gifUrl = useObjectUrl(gifBlob);

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

  const resetVideo = () => {
    setVideoFile(null);
    setVideoDuration(0);
    setGifBlob(null);
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
    setGifBlob(null);

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
      setShowResult(true);

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

  const statItems = videoFile
    ? [
        ['Video', formatFileSize(videoFile.size)],
        ['GIF', gifBlob ? formatFileSize(gifBlob.size) : '-'],
      ]
    : [];

  return (
    <ToolPageLayout
      title="Video to GIF Converter"
      description="Convert MP4, WebM, MOV and other videos your browser can play to animated GIFs online."
      keywords="video to gif, mp4 to gif, webm to gif, avi to gif, convert video to gif, gif maker, online gif converter"
      canonicalUrl="/tools/video-to-gif"
      pageTitle="Video to GIF Converter | sLixTOOLS"
      pageDescription="Convert MP4, WebM, MOV and other videos your browser can play to animated GIFs online. Fast, free, and secure video to GIF conversion."
      breadcrumbLabel="Video to GIF"
      belowTool={seoContent}
      faq={[
        {
          question: 'Is my video uploaded to a server?',
          answer: 'No. The conversion runs entirely in your browser, so your video never leaves your device.',
        },
        {
          question: 'Which video formats can I convert?',
          answer: 'Any format your browser can play. MP4 and WebM work almost everywhere, MOV in most browsers. AVI, MKV, FLV and WMV usually do not, so convert those with the Video Converter first.',
        },
        {
          question: 'How can I make the GIF file smaller?',
          answer: 'Lower the frame rate and width, reduce the duration by trimming, or use the GIF Compressor tool afterwards for further optimization.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {!videoFile ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
              acceptedTypes={[...CONFIG.SUPPORTED_FORMATS]}
              maxFileSize={CONFIG.MAX_FILE_SIZE}
              onFileSelected={handleFileSelected}
              onUrlSubmit={handleUrlSubmit}
              showUrlInput={true}
              urlPlaceholder="https://example.com/video.mp4"
              fileCategory="video"
              title="Drop your video here"
              description="or click to browse files"
            />
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <SourceChip
                icon={Clapperboard}
                name={videoFile.name}
                meta={formatFileSize(videoFile.size)}
                onRemove={resetVideo}
                disabled={isConverting}
              />
              {gifUrl && (
                <>
                  <ToolbarDivider />
                  <div role="group" aria-label="Preview" className={segmentGroup}>
                    {PREVIEW_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={showResult === (mode === 'GIF')}
                        onClick={() => setShowResult(mode === 'GIF')}
                        className={segmentButton}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 lg:ml-auto">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isConverting}
                  className={gifBlob ? chipButton : primaryButton}
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  {isConverting ? 'Converting...' : 'Convert to GIF'}
                </button>
                {gifBlob && (
                  <button type="button" onClick={handleDownload} className={primaryButton}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </button>
                )}
              </div>
            </div>

            <div className={settingsGrid}>
              <div className="relative min-h-[40dvh] min-w-0 lg:min-h-0">
                {showResult && gifUrl ? (
                  <img src={gifUrl} alt="Generated GIF" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <video
                    src={videoUrl ?? undefined}
                    controls
                    // Recorded WebM can report Infinity; keep the duration from file selection instead
                    onLoadedMetadata={(e) => {
                      if (Number.isFinite(e.currentTarget.duration)) setVideoDuration(e.currentTarget.duration);
                    }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </div>

              <fieldset disabled={isConverting} className={cn(settingsColumn, 'min-w-0')}>
                <ConversionOptionsComponent
                  videoFile={videoFile}
                  options={conversionOptions}
                  onChange={setConversionOptions}
                  videoDuration={videoDuration}
                  disabled={isConverting}
                />
              </fieldset>
            </div>

            <dl className={statusRow}>
              {statItems.map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt>{label}:</dt>
                  <dd className="tabular-nums text-slate-200">{value}</dd>
                </div>
              ))}
              {isConverting && (
                <div className="flex items-center gap-1.5">
                  <dt>Converting:</dt>
                  <dd className="flex items-center gap-2 tabular-nums text-slate-200">
                    <Progress value={progress * 100} aria-label="Conversion progress" className="h-1.5 w-32" />
                    {Math.round(progress * 100)}%
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default VideoToGif;
