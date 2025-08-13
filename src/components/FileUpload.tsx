
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Video, FileVideo } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        if (parseFloat(fileSizeInMB) > 50) {
          toast.error('File too large', {
            description: 'Maximum file size is 50MB',
          });
          return;
        }
        setFileName(file.name);
        setFileSize(`${fileSizeInMB} MB`);
        onFileSelected(file);
        toast.success('File selected', {
          description: file.name,
        });
      } else {
        toast.error('Invalid file type', {
          description: 'Please select a valid video file (MP4, WebM, AVI)',
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Safari fix: Ensure dataTransfer is properly set
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Safari fix: Only hide drag state if leaving the actual drop zone
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
    
    // Safari fix: Check for dataTransfer availability
    if (!e.dataTransfer) {
      console.warn('DataTransfer not available in Safari');
      return;
    }
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        if (parseFloat(fileSizeInMB) > 50) {
          toast.error('File too large', {
            description: 'Maximum file size is 50MB',
          });
          return;
        }
        setFileName(file.name);
        setFileSize(`${fileSizeInMB} MB`);
        onFileSelected(file);
        toast.success('File selected', {
          description: file.name,
        });
      } else {
        toast.error('Invalid file type', {
          description: 'Please select a valid video file (MP4, WebM, AVI)',
        });
      }
    }
  };

  return (
    <motion.div 
      className={`relative flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-green-500/50 bg-black/20 backdrop-blur-sm rounded-lg transition-all duration-300 w-full max-w-lg mx-auto hover:border-green-400 hover:bg-green-500/5 ${
        isDragging ? 'border-green-400 bg-green-500/10 shadow-lg shadow-green-500/20' : ''
      }`}
      style={{
        // Safari fixes for drag-and-drop
        touchAction: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      {isDragging && (
        <motion.div 
          className="absolute inset-0 bg-green-500/10 border-2 border-green-400 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      
      <motion.div 
        className="relative z-10 flex flex-col items-center justify-center w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-4">
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <Video className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <h3 className="text-lg font-mono font-bold text-green-400 mb-2 uppercase tracking-wider">
          {fileName ? 'VIDEO READY' : 'DRAG & DROP YOUR MP4, WEBM, OR AVI FILE HERE'}
        </h3>
        
        {fileName ? (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg w-full max-w-sm">
            <div className="flex items-center gap-3">
              <FileVideo className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <p className="text-green-400 text-sm font-mono font-bold truncate">{fileName}</p>
                <p className="text-green-500/70 text-xs font-mono">{fileSize}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 my-3">
              <div className="h-px w-12 bg-green-500/50"></div>
              <span className="text-green-400 text-xs font-mono font-bold">OR</span>
              <div className="h-px w-12 bg-green-500/50"></div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 hover:border-green-400 text-green-400 hover:text-green-300 font-mono font-bold py-2 px-4 rounded transition-all duration-200 text-sm uppercase tracking-wider"
            >
              BROWSE FILES
            </Button>
          </>
        )}
        
        <div className="mt-3 text-xs text-green-500/70 font-mono">
          MAX FILE SIZE: 50MB
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/mp4,video/webm,video/x-msvideo,.mp4,.webm,.avi"
          className="hidden"
        />
      </motion.div>
    </motion.div>
  );
};

export default FileUpload;
