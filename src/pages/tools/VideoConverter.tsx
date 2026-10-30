import { useCallback, useState } from 'react';
import { Download, FileVideo, Film, SlidersHorizontal, TriangleAlert, Wand2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { validateVideoFile } from '@/utils/fileValidation';
import { compressVideo, VideoCompressionOptions } from '@/utils/videoProcessor';
import { useObjectUrl, useToolFile } from '@/hooks';
import { formatFileSize, formatSizeChange } from '@/utils/formatters';
import ToolPageLayout from '@/components/ToolPageLayout';
import FileUploadArea from '@/components/FileUploadArea';
import SettingSlider from '@/components/tools/SettingSlider';
import SourceChip from '@/components/tools/SourceChip';
import { ToolbarDivider } from '@/components/tools/ToolBar';
import { toast } from 'sonner';
import { downloadBlobWithGeneratedName } from '@/utils/download';
import { cn } from '@/lib/utils';
import {
  chipButton,
  guideCard,
  guideHeading,
  primaryButton,
  sectionLabel,
  segmentButton,
  segmentGroup,
  settingsColumn,
  settingsGrid,
  statusRow,
  toolDropzone,
  toolWorkspace,
  toolbarRow,
} from '@/styles/constants';

const FORMATS: { value: VideoCompressionOptions['format']; label: string }[] = [
  { value: 'mp4', label: 'MP4' },
  { value: 'webm', label: 'WebM' },
  { value: 'avi', label: 'AVI' },
  { value: 'mov', label: 'MOV' },
];

const PREVIEW_MODES = ['Original', 'Converted'] as const;

const guideItem = (term: string, text: string) => (
  <li key={term}>
    <strong className="text-white">{term}</strong> {text}
  </li>
);

const seoContent = (
  <div className="max-w-6xl mx-auto px-4 space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
        <FileVideo className="h-5 w-5" aria-hidden="true" />
      </span>
      Converting Videos
    </h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <Film className="h-5 w-5" aria-hidden="true" />
          Which Format for What
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('MP4:', 'plays almost everywhere. The safe default.')}
          {guideItem('WebM:', 'made for the web, plays in all modern browsers.')}
          {guideItem('MOV:', 'the same H.264 video as MP4, for Apple apps and editors.')}
          {guideItem('AVI:', 'for older software and players.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          Settings
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Quality (CRF):', 'lower looks better but makes larger files. 23 is a good start.')}
          {guideItem('Max size:', 'the video shrinks to fit and keeps its aspect ratio. It is never enlarged.')}
          {guideItem('Frame rate:', 'lower saves space. Going above the source only repeats frames.')}
        </ul>
      </section>
      <section className={guideCard}>
        <h3 className={guideHeading}>
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          Good to Know
        </h3>
        <ul className="space-y-1.5 text-sm text-gray-300">
          {guideItem('Limit:', 'up to 100 MB per video.')}
          {guideItem('Speed:', 'everything runs on your device, so keep this tab open while it works.')}
          {guideItem('Larger result:', 'converting can grow a file. Raise the CRF or lower the size if it does.')}
          {guideItem('Preview:', 'browsers cannot play every format, AVI especially. The download still works.')}
        </ul>
      </section>
    </div>
  </div>
);

const VideoConverter = () => {
  const [convertedVideo, setConvertedVideo] = useState<Blob | null>(null);
  // Format the current result was produced with (options.format may change afterwards)
  const [convertedFormat, setConvertedFormat] = useState<VideoCompressionOptions['format']>('mp4');
  const [showResult, setShowResult] = useState(false);
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
  const convertedUrl = useObjectUrl(convertedVideo);

  const {
    file: videoFile,
    fileUrl: videoUrl,
    handleFileSelect,
    clearFile
  } = useToolFile({
    validateFunction: validateVideoFile,
    onFileLoad: () => {
      // Reset conversion state
      setConvertedVideo(null);
    },
    onFileError: (error) => {
      toast.error('File validation error: ' + error.message);
    }
  });

  const removeFile = () => {
    clearFile();
    setConvertedVideo(null);
  };

  const setOption = (patch: Partial<VideoCompressionOptions>) => setOptions((prev) => ({ ...prev, ...patch }));

  const handleConvert = useCallback(async () => {
    if (!videoFile) return;

    setIsConverting(true);
    setProgress(0);
    setConvertedVideo(null);

    try {
      const result = await compressVideo(
        videoFile,
        options,
        (progressData) => setProgress(progressData.progress)
      );

      setConvertedVideo(result);
      setConvertedFormat(options.format);
      setShowResult(true);

      toast.success('Video converted successfully!');
    } catch (error) {
      toast.error('Video conversion failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsConverting(false);
    }
  }, [videoFile, options]);

  const handleDownload = useCallback(() => {
    if (!convertedVideo) return;

    downloadBlobWithGeneratedName(
      convertedVideo,
      'converted',
      videoFile?.name,
      convertedFormat,
      { showToast: true }
    );
  }, [convertedVideo, videoFile?.name, convertedFormat]);

  const statItems = videoFile
    ? [
        ['Original', formatFileSize(videoFile.size)],
        ['Converted', convertedVideo ? formatFileSize(convertedVideo.size) : '-'],
        ['Change', convertedVideo ? formatSizeChange(videoFile.size, convertedVideo.size) : '-'],
      ]
    : [];

  return (
    <ToolPageLayout
      title="Video Converter"
      description="Convert your videos between different formats with customizable quality and compression settings. All processing happens in your browser for maximum privacy."
      keywords="video converter, video compression, MP4, WebM, AVI, video format conversion"
      canonicalUrl="/tools/video-converter"
      pageTitle="Video Converter - sLixTOOLS"
      pageDescription="Convert videos between different formats like MP4, WebM, and AVI with customizable quality settings."
      breadcrumbLabel="Video Converter"
      belowTool={seoContent}
      faq={[
        {
          question: 'Which formats can I convert between?',
          answer: 'MP4, WebM, AVI and MOV are supported as output formats, with most common video formats accepted as input.',
        },
        {
          question: 'How long does a conversion take?',
          answer: 'Conversion speed depends on your device since everything runs locally in your browser. Short clips usually convert in seconds.',
        },
        {
          question: 'Why is my converted video larger than the original?',
          answer: 'Phone and web videos are often compressed very tightly, so a new encode can come out larger. Raise the CRF or lower the maximum size and convert again.',
        },
        {
          question: 'Are my videos uploaded anywhere?',
          answer: 'No. All conversion happens on your device with WebAssembly — your files are never transmitted.',
        },
      ]}
    >
      <div className={toolWorkspace}>
        {!videoFile ? (
          <div className={toolDropzone}>
            <FileUploadArea
              fill
              onFileSelected={handleFileSelect}
              acceptedTypes={['video/*']}
              fileCategory="video"
              title="Drop your video here"
              description="or click to browse files (MP4, WebM, AVI, MOV and more)"
            />
          </div>
        ) : (
          <>
            <div className={toolbarRow}>
              <SourceChip
                icon={FileVideo}
                name={videoFile.name}
                meta={formatFileSize(videoFile.size)}
                onRemove={removeFile}
                disabled={isConverting}
              />
              {convertedUrl && (
                <>
                  <ToolbarDivider />
                  <div role="group" aria-label="Preview" className={segmentGroup}>
                    {PREVIEW_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={showResult === (mode === 'Converted')}
                        onClick={() => setShowResult(mode === 'Converted')}
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
                  className={convertedVideo ? chipButton : primaryButton}
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  {isConverting ? 'Converting...' : 'Convert'}
                </button>
                {convertedVideo && (
                  <button type="button" onClick={handleDownload} className={primaryButton}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </button>
                )}
              </div>
            </div>

            <div className={settingsGrid}>
              <div className="relative min-h-[40dvh] min-w-0 lg:min-h-0">
                <video
                  src={(showResult && convertedUrl) || videoUrl}
                  controls
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>

              <fieldset disabled={isConverting} className={cn(settingsColumn, 'min-w-0')}>
                <div className="space-y-2">
                  <p className={cn(sectionLabel, 'mt-0')}>Format</p>
                  <div role="group" aria-label="Output format" className={segmentGroup}>
                    {FORMATS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={options.format === value}
                        onClick={() => setOption({ format: value })}
                        className={segmentButton}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <SettingSlider
                  label="Quality (CRF)"
                  value={options.quality}
                  valueText={String(options.quality)}
                  onChange={(quality) => setOption({ quality })}
                  min={18}
                  max={35}
                  step={1}
                  hint="Lower values = higher quality, larger file size"
                  disabled={isConverting}
                />
                <SettingSlider
                  label="Max width"
                  value={options.maxWidth}
                  valueText={`${options.maxWidth} px`}
                  onChange={(maxWidth) => setOption({ maxWidth })}
                  min={480}
                  max={3840}
                  step={160}
                  disabled={isConverting}
                />
                <SettingSlider
                  label="Max height"
                  value={options.maxHeight}
                  valueText={`${options.maxHeight} px`}
                  onChange={(maxHeight) => setOption({ maxHeight })}
                  min={360}
                  max={2160}
                  step={120}
                  disabled={isConverting}
                />
                <SettingSlider
                  label="Frame rate"
                  value={options.fps || 30}
                  valueText={`${options.fps} fps`}
                  onChange={(fps) => setOption({ fps })}
                  min={15}
                  max={60}
                  step={5}
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
                    <Progress value={progress} aria-label="Conversion progress" className="h-1.5 w-32" />
                    {Math.round(progress)}%
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

export default VideoConverter;
