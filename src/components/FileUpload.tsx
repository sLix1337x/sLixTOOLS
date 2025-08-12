
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
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
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
      className={`relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed ${isDragging ? 'border-blue-400 bg-black/50' : 'border-green-400/50 bg-black/30'} rounded-lg transition-all duration-300 w-full max-w-2xl mx-auto`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {isDragging ? (
        <motion.div 
          className="absolute inset-0 bg-blue-400/10 border-2 border-dashed border-blue-400 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      ) : null}
      
      <motion.div 
        className="relative z-10 flex flex-col items-center justify-center w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative mb-4">
          <div className="absolute -inset-1 bg-blue-400/30 rounded-full blur-sm"></div>
          <div className="relative p-4 bg-black/80 border-2 border-dashed border-green-400/50 rounded-full">
            <Video className="h-10 w-10 text-green-400" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-green-300 mb-2">
          {fileName ? 'VIDEO READY' : 'UPLOAD YOUR VIDEO'}
        </h3>
        
        {fileName ? (
          <div className="mt-2 p-3 bg-black/50 border border-dashed border-green-400/30 rounded-md w-full max-w-md">
            <div className="flex items-center justify-center gap-2">
              <FileVideo className="h-5 w-5 text-blue-400" />
              <div className="text-left">
                <p className="text-green-300 font-mono text-sm truncate max-w-xs">{fileName}</p>
                <p className="text-blue-300 text-xs">{fileSize}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-green-300/80 text-sm mb-4 max-w-md">
            DRAG & DROP YOUR MP4, WEBM, OR AVI FILE HERE
          </p>
        )}
        
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="h-px w-16 bg-green-400/30"></div>
          <span className="text-green-400/60 text-xs">OR</span>
          <div className="h-px w-16 bg-green-400/30"></div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 border-2 border-dashed border-green-400/50 bg-black/50 text-green-300 hover:bg-green-400/10 hover:border-green-300/70 hover:text-green-200 transition-all duration-300 font-mono tracking-wider py-2 px-6 rounded-none"
        >
          BROWSE FILES
        </Button>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-green-400/60">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>MAX FILE SIZE: 50MB</span>
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
