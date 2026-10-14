import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileVideo, FileAudio, File, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AnimatedElement from '@/components/AnimatedElement';
import { validateFile } from '@/utils/fileValidation';
import { formatFileSizeMB } from '@/utils/formatters';
import { useLoading } from '@/hooks';

interface FileUploadAreaProps {
  onFileSelected: (file: File) => void;
  acceptedTypes?: string[] | undefined;
  maxFileSize?: number | undefined; // in bytes
  fileCategory?: 'image' | 'video' | 'audio' | 'document' | 'general' | undefined;
  title?: string | undefined;
  description?: string | undefined;
  className?: string | undefined;
  showUrlInput?: boolean | undefined;
  onUrlSubmit?: ((url: string) => void) | undefined;
  urlPlaceholder?: string | undefined;
  /**
   * When set, the file preview renders INSIDE the dashed frame (replacing the
   * default icon/title content). Drop and click keep working to replace the file.
   */
  previewSrc?: string | null | undefined;
  /** Allow picking/dropping several files; onFileSelected fires once per valid file. */
  multiple?: boolean | undefined;
}

/**
 * Reusable file upload area component with drag-and-drop support
 * Supports different file types, validation, and URL input
 */
const FileUploadArea = ({
  onFileSelected,
  acceptedTypes = ['*'],
  maxFileSize,
  fileCategory = 'general',
  title,
  description,
  className = '',
  showUrlInput = false,
  onUrlSubmit,
  urlPlaceholder = 'Enter URL...',
  previewSrc = null,
  multiple = false
}: FileUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const { isLoading: isLoadingFromUrl, executeWithLoading } = useLoading();

  // Get appropriate icon based on file category
  const getIcon = () => {
    switch (fileCategory) {
      case 'image':
        return <ImagePlus className="h-8 w-8 text-sky-400" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-sky-400" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-sky-400" />;
      case 'document':
        return <File className="h-8 w-8 text-sky-400" />;
      default:
        return <Upload className="h-8 w-8 text-sky-400" />;
    }
  };

  // Get default title and description based on file category
  const getDefaultContent = () => {
    switch (fileCategory) {
      case 'image':
        return {
          title: 'Drop your image here',
          description: 'or click to browse files (JPG, PNG, WEBP, GIF)'
        };
      case 'video':
        return {
          title: 'Drop your video here',
          description: 'or click to browse files (MP4, WebM, AVI, MOV)'
        };
      case 'audio':
        return {
          title: 'Drop your audio here',
          description: 'or click to browse files (MP3, WAV, OGG)'
        };
      case 'document':
        return {
          title: 'Drop your document here',
          description: 'or click to browse files (PDF, DOC, TXT)'
        };
      default:
        return {
          title: 'Drop your file here',
          description: 'or click to browse files'
        };
    }
  };

  const defaultContent = getDefaultContent();
  const displayTitle = title || defaultContent.title;
  const displayDescription = description || defaultContent.description;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Allow re-selecting the same file (input keeps its value otherwise)
    e.target.value = '';
  };

  const processFiles = (files: FileList) => {
    if (!multiple) {
      processFile(files[0]);
      return;
    }
    Array.from(files).forEach(f => processFile(f, true));
  };

  const processFile = (file: File, quiet = false) => {
    // Use centralized validation
    const validationOptions: Parameters<typeof validateFile>[1] = {};
    if (maxFileSize !== undefined) {
      validationOptions.maxFileSize = maxFileSize;
    }
    if (!acceptedTypes.includes('*')) {
      validationOptions.supportedFormats = acceptedTypes;
    }
    const validation = validateFile(file, validationOptions);

    if (!validation.isValid) {
      toast.error('Invalid file', {
        description: validation.error
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toast.warning('File warning', {
          description: warning
        });
      });
    }

    const fileSizeInMB = formatFileSizeMB(file.size);
    setFileName(file.name);
    setFileSize(fileSizeInMB);
    onFileSelected(file);

    if (!quiet) {
      toast.success('File selected', {
        description: file.name
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer) {
      // DataTransfer not available - logged to error reporting system
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlValue.trim() || !onUrlSubmit) return;

    try {
      await executeWithLoading(async () => {
        await onUrlSubmit(urlValue.trim());
        setUrlValue('');
      });
    } catch (error) {
      toast.error('Failed to load from URL', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const acceptString = acceptedTypes.includes('*')
    ? undefined
    : acceptedTypes.map(type => {
        // If it's a MIME type (contains '/'), use as-is
        if (type.includes('/')) {
          return type;
        }
        // Otherwise, treat as file extension and add dot if needed
        return type.startsWith('.') ? type : `.${type}`;
      }).join(',');

  return (
    <AnimatedElement type="fadeIn" delay={0.6} className="space-y-6 w-full max-w-2xl mx-auto">
      <motion.div
        className={`border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-sky-400/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isDragging ? 'border-sky-400 bg-sky-400/10' : ''
          } ${className}`}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={`${previewSrc ? 'Replace' : 'Upload'} ${fileCategory === 'general' ? 'file' : fileCategory}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver as React.DragEventHandler<HTMLDivElement>}
        onDragLeave={handleDragLeave as React.DragEventHandler<HTMLDivElement>}
        onDrop={handleDrop as React.DragEventHandler<HTMLDivElement>}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {isDragging && (
          <motion.div
            className="absolute inset-0 bg-sky-500/10 border-2 border-sky-400 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}

        {previewSrc ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <img
              src={previewSrc}
              alt="Uploaded file preview"
              className="max-h-56 object-contain rounded-md"
            />
            <p className="text-xs text-gray-400">
              Drop a new {fileCategory === 'general' ? 'file' : fileCategory} here or click to
              browse — it replaces the current one
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-gray-800/50">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">{displayTitle}</h3>
              <p className="text-sm text-gray-400 mt-1">{displayDescription}</p>
            </div>

            {fileName && (
              <div className="mt-3 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg w-full max-w-sm">
                <div className="flex items-center gap-3">
                  {getIcon()}
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sky-400 text-sm font-medium truncate">{fileName}</p>
                    <p className="text-sky-500/70 text-xs">{fileSize}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={acceptString}
          multiple={multiple}
          onChange={handleFileChange}
        />
      </motion.div>

      {showUrlInput && (
        <div className="relative">
          <div className="flex items-center mb-2">
            <div className="h-px bg-gray-700 flex-1"></div>
            <span className="px-3 text-sm text-gray-400">or</span>
            <div className="h-px bg-gray-700 flex-1"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder={urlPlaceholder}
              aria-label="File URL"
              className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              disabled={isLoadingFromUrl}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlValue.trim() || isLoadingFromUrl}
              className="bg-primary-action hover:bg-primary-action/90 shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingFromUrl ? 'Loading...' : 'Load'}
            </Button>
          </div>
        </div>
      )}
    </AnimatedElement>
  );
};

export default FileUploadArea;