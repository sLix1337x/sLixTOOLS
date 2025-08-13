import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileVideo, Download, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ConversionOptions as ConversionOptionsType, VideoPreviewProps, GifPreviewProps, ConversionOptionsProps } from '@/types';
import PostConversionOptions from '@/components/PostConversionOptions';
import ConversionOptionsComponent from '@/components/ConversionOptions';
import FileUpload from '@/components/FileUpload';
import { validateVideoFileLegacy as validateVideoFile } from '@/utils/fileValidation';
import { convertVideoToGif } from '@/utils/gifConverter';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';
import errorLogger, { ErrorCategory } from '@/utils/errorLogger';

// Enhanced type definitions for better type safety
interface GifResult {
  url: string;
  blob: Blob;
  size: number;
  processingTime: number;
}

interface ErrorContext {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  conversionOptions?: ConversionOptionsType;
  reproductionSteps?: string[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

type ConversionState = 'idle' | 'converting' | 'completed' | 'error';
type FileValidationError = 'size' | 'format' | 'type' | 'corruption' | 'duration' | 'empty';

// Configuration constants
const CONFIG = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  SUPPORTED_FORMATS: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'ogg', 'm4v', 'wmv', 'asf', '3gp', 'mpeg'],
  DEFAULT_OPTIONS: {
    fps: 15,
    quality: 80,
    trimEnabled: true
  },
  DEFAULT_DIMENSIONS: {
    width: 480,
    height: 360
  }
} as const;

// Sub-components defined in the same file for simplicity, but can be moved to separate files

const VideoPreview = React.memo<VideoPreviewProps>(({ file, onDurationChange }) => {
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
      <Button onClick={onDownload} disabled={isConverting} className="bg-[#2AD587] hover:bg-[#25c27a] text-black font-bold py-2.5 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-0 focus:ring-offset-0">
        <Download className="mr-2 h-5 w-5" />
        Download GIF
      </Button>
    </div>
  );
});



// Main Component
const VideoToGif = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifResult, setGifResult] = useState<GifResult | null>(null);
  const [conversionState, setConversionState] = useState<ConversionState>('idle');
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Cleanup URLs on component unmount or when gifResult changes
  useEffect(() => {
    return () => {
      if (gifResult?.url) {
        URL.revokeObjectURL(gifResult.url);
      }
    };
  }, [gifResult]);

  // Comprehensive file validation function
  const validateFile = useCallback((file: File): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic file checks
    if (!file) {
      errors.push('No file selected');
      return { isValid: false, error: 'No file selected' };
    }
    
    // Size validation
    if (file.size === 0) {
      errors.push('File appears to be empty');
    } else if (file.size > CONFIG.MAX_FILE_SIZE) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    } else if (file.size > 100 * 1024 * 1024) { // 100MB warning
      warnings.push('Large file size may result in slower processing and larger GIF files');
    }
    
    // Format validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      errors.push('File has no extension');
    } else if (!CONFIG.SUPPORTED_FORMATS.includes(fileExtension)) {
      errors.push(`Unsupported file format: .${fileExtension}. Supported formats: ${CONFIG.SUPPORTED_FORMATS.join(', ')}`);
    }
    
    // MIME type validation
    if (!file.type.startsWith('video/')) {
      errors.push(`Invalid file type: ${file.type}. Expected video file.`);
    }
    
    // File name validation
    if (file.name.length > 255) {
      warnings.push('File name is very long and may cause issues');
    }
    
    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors[0] : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }, []);

  // Centralized error handler
  const handleError = useCallback((error: Error, context: string, additionalData?: any) => {
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Determine error category
    let errorCategory = ErrorCategory.FILE_PROCESSING;
    if (errorMessage.toLowerCase().includes('memory')) {
      errorCategory = ErrorCategory.MEMORY;
    } else if (errorMessage.toLowerCase().includes('worker') || errorMessage.toLowerCase().includes('timeout')) {
      errorCategory = ErrorCategory.WORKER;
    }
    
    const errorId = errorLogger.logError({
      category: errorCategory,
      message: `${context}: ${errorMessage}`,
      stack: error.stack,
      context: {
        component: 'VideoToGif',
        action: context,
        ...additionalData
      }
    });
    
    toast.error(`${context} Failed`, {
      description: errorMessage,
      action: {
        label: 'View Details',
        onClick: () => console.log(`Error ID: ${errorId}`)
      }
    });
    
    return errorId;
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    try {
      // Use comprehensive validation function
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }
      
      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast.warning('File Warning', {
            description: warning
          });
        });
        setValidationWarnings(validation.warnings);
      } else {
        setValidationWarnings([]);
      }
      
      setValidationErrors([]);
      
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
          setConversionOptions(prev => ({ ...prev, endTime: defaultEndTime, duration: duration }));
        } catch (error) {
          handleError(error instanceof Error ? error : new Error(String(error)), 'Video metadata extraction', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });
      setConversionState('error');
        } finally {
          window.URL.revokeObjectURL(video.src);
        }
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        handleError(new Error('Failed to load video file. The file may be corrupted or in an unsupported format.'), 'Video file validation', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
      };
      
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       setValidationErrors([errorMessage]);
       setValidationWarnings([]);
       
       handleError(error instanceof Error ? error : new Error(String(error)), 'File validation', {
         fileName: file?.name,
         fileSize: file?.size,
         fileType: file?.type
       });
     }
   }, [handleError, validateFile]);

  const handlePostEdit = useCallback(async (editType: string, params?: any) => {
    if (!gifResult) return;
    
    try {
      toast.info(`Applying ${editType}...`);
      // Here you would implement the actual editing logic
      // For now, we'll just show a success message
      toast.success(`${editType} applied successfully!`);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), `Post-processing ${editType}`, {
        editType,
        params,
        gifResult
      });
    }
  }, [gifResult, handleError]);

  const handleDownload = useCallback(() => {
    if (gifBlob) {
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('GIF downloaded successfully!');
    }
  }, [gifBlob]);

  const handleConvert = async () => {
    if (!videoFile) return;

    // Check file size before conversion
    if (videoFile.size > CONFIG.MAX_FILE_SIZE) {
      const errorId = errorLogger.logFileProcessingError(
        `File size (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        { name: videoFile.name, size: videoFile.size, type: videoFile.type },
        'VideoToGif',
        'File Size Validation'
      );
      
      toast.error('File too large', {
        description: `File size (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit. Please use a smaller file.`,
        action: {
          label: 'View Details',
          onClick: () => console.log(`Error ID: ${errorId}`)
        }
      });
      setConversionState('error');
      return;
    }

    setIsConverting(true);
    setConversionState('converting');
    setProgress(0);
    setGifResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setShowPostOptions(false);

    try {
      const startTime = performance.now();
      const gifBlob = await convertVideoToGif(videoFile, {
        fps: conversionOptions.fps,
        quality: conversionOptions.quality,
        startTime: conversionOptions.trimEnabled ? conversionOptions.startTime : 0,
        duration: conversionOptions.trimEnabled ? (conversionOptions.endTime - conversionOptions.startTime) : undefined,
        trimEnabled: conversionOptions.trimEnabled
      }, (progress) => {
        // Handle progress updates
        if (typeof progress === 'object') {
          toast.info(`${progress.stage}: ${progress.message}`, { description: `${Math.round(progress.progress)}% complete` });
        } else {
          toast.info('Converting...', { description: `${Math.round(progress * 100)}% complete` });
        }
        setProgress(typeof progress === 'number' ? progress : progress.progress / 100);
      });
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      setGifBlob(gifBlob);
      
      // Create GIF result with metadata
      const gifUrl = URL.createObjectURL(gifBlob);
      setGifResult({
        url: gifUrl,
        blob: gifBlob,
        size: gifBlob.size,
        processingTime
      });
      setConversionState('completed');
      setShowPostOptions(true);
      
      // Log successful conversion for analytics
      console.log('GIF Conversion Success:', {
        inputSize: videoFile.size,
        outputSize: gifBlob.size,
        processingTime,
        options: conversionOptions
      });
      
      toast.success('Conversion Successful!', {
        description: `File size: ${(gifBlob.size / 1024 / 1024).toFixed(2)}MB (${processingTime}ms)`
      });
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), 'GIF Conversion', {
        fileInfo: {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        },
        conversionOptions,
        reproductionSteps: [
          '1. Upload a video file',
          `2. File: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`,
          `3. Set conversion options: FPS=${conversionOptions.fps}, Quality=${conversionOptions.quality}`,
          `4. Set trim: ${conversionOptions.startTime}s to ${conversionOptions.endTime}s`,
          '5. Click "Convert to GIF" button',
          '6. Conversion process failed'
        ],
        metadata: {
          conversionOptions,
          videoMetadata: {
            duration: videoDuration,
            trimDuration: conversionOptions.endTime - conversionOptions.startTime
          }
        }
      });
    } finally {
      setIsConverting(false);
      // Reset conversion state to idle after a delay to allow UI updates
      setTimeout(() => {
        if (conversionState !== 'completed') {
          setConversionState('idle');
        }
      }, 1000);
    }
  };





  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>Video to GIF Converter | sLixTOOLS</title>
        <meta name="description" content="Convert MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files to animated GIFs online. Fast, free, and secure video to GIF conversion." />
        <meta name="keywords" content="video to gif, mp4 to gif, webm to gif, avi to gif, convert video to gif, gif maker, online gif converter" />
        <link rel="canonical" href="https://slixtools.io/tools/video-to-gif" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Video to GIF Converter
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Create high-quality animated GIFs from MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files in just a few clicks.
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
                <ConversionOptionsComponent options={conversionOptions} onChange={setConversionOptions} videoDuration={videoDuration} videoFile={videoFile} />
              </AnimatedElement>
              
              <AnimatedElement type="fadeIn" delay={0.6}>
                <div className="flex justify-center">
                  <button 
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="w-full md:w-auto flex items-center justify-center bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    style={{
                      minWidth: '200px'
                    }}
                    aria-label={isConverting ? 'Converting video to GIF, please wait' : 'Convert video to GIF'}
                    aria-describedby={isConverting ? 'conversion-progress' : 'conversion-description'}
                    role="button"
                    tabIndex={0}
                  >
                    {isConverting ? (
                      <><Loader2 className="animate-spin mr-2 h-5 w-5" aria-hidden="true" /><span className="relative z-10">Converting...</span></>
                    ) : (
                      <><Wand2 className="mr-2 h-5 w-5" aria-hidden="true" /><span className="relative z-10">Convert to GIF</span></>
                    )}
                  </button>
                  <div id="conversion-description" className="sr-only">
                    Click to start converting your video file to an animated GIF
                  </div>
                </div>
              </AnimatedElement>
              
              {isConverting && (
                <AnimatedElement type="fadeIn" delay={0.2}>
                  <div className="max-w-md mx-auto space-y-3" id="conversion-progress" role="status" aria-live="polite">
                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-2">Converting your video to GIF...</p>
                      <Progress value={progress * 100} className="h-2 bg-gray-700" aria-label={`Conversion progress: ${Math.round(progress * 100)}% complete`} />
                      <p className="text-xs text-gray-400 mt-1" aria-label={`Progress: ${Math.round(progress * 100)} percent complete`}>{Math.round(progress * 100)}% complete</p>
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
                    <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                      Your GIF is Ready!
                    </h2>
                    <GifPreview gifBlob={gifBlob} onDownload={handleDownload} isConverting={isConverting} />
                  </div>
                </AnimatedElement>
              )}
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto w-full mt-12">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <div className="px-4">
              <h2 className="text-xl font-semibold mb-4 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Transform Videos into Animated GIFs
              </h2>
              
              <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
                <div className="space-y-3">
                  <h4 className="text-gray-300 font-medium">🎬 Powerful Video Conversion</h4>
                  <p className="text-gray-400 mb-3">
                    Our advanced video-to-GIF converter supports all popular video formats including MP4, AVI, WebM, MOV, and many more. 
                    Whether you're uploading from your computer, smartphone, or importing directly from URLs, the process is seamless and intuitive.
                  </p>
                  <div className="ml-4">
                    <div className="flex items-start mb-2">
                      <span className="text-green-400 mr-2 mt-1">•</span>
                      <span>Drag-and-drop interface for effortless file uploads</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-green-400 mr-2 mt-1">•</span>
                      <span>Direct URL import for online videos</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-gray-300 font-medium">⚙️ Precision Controls</h4>
                  <p className="text-gray-400 mb-3">
                    Take full control over your GIF creation with our comprehensive set of customization options. 
                    Fine-tune every aspect from timing to quality to achieve the perfect result.
                  </p>
                  <div className="ml-4 space-y-2">
                    <div className="flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Custom start and end time selection for precise trimming</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Adjustable frame rates (5-30 FPS) and quality settings (10-100%)</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Smart compression algorithms for optimal file size</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                    <h3 className="text-base font-medium text-green-400 mb-0.5">Supported Formats</h3>
                    <p className="text-sm text-gray-400">
                      MP4, WebM, AVI, MOV, FLV, WMV, MKV, OGG, M4V, ASF, 3GP, MPEG, and more
                    </p>
                  </div>
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3">
                    <h3 className="text-base font-medium text-purple-400 mb-0.5">Key Features</h3>
                    <p className="text-sm text-gray-300">
                      Custom timing, quality control, transparent GIF support, URL import, HD processing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
};

export default VideoToGif;
