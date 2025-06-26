
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface VideoPreviewProps {
  videoFile: File;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoFile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  useEffect(() => {
    if (videoRef.current && videoFile) {
      const url = URL.createObjectURL(videoFile);
      videoRef.current.src = url;
      
      // Set up event listeners
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };
      
      const handleTimeUpdate = () => {
        if (video.duration) {
          setCurrentTime(video.currentTime);
          setProgress((video.currentTime / video.duration) * 100);
        }
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      
      return () => {
        URL.revokeObjectURL(url);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [videoFile]);
  
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div 
      className={`relative bg-black/80 rounded-lg overflow-hidden border-2 border-dashed border-green-400/50 ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <video 
        ref={videoRef}
        className="w-full h-auto"
        style={{ maxHeight: isFullscreen ? 'none' : '70vh' }}
        onClick={togglePlayPause}
        playsInline
      />
      
      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
        {/* Progress Bar */}
        <div 
          className="h-1.5 bg-green-900/50 rounded-full mb-3 cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
        >
          <motion.div 
            className="h-full bg-green-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={togglePlayPause}
              className="p-1.5 rounded-full bg-green-600 hover:bg-green-500 transition-colors text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-1.5 rounded-full bg-green-600/50 hover:bg-green-500/50 transition-colors text-white"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            
            <span className="text-green-300 text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          {/* Right Controls */}
          <div>
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full bg-green-600/50 hover:bg-green-500/50 transition-colors text-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={togglePlayPause}
        >
          <div className="p-3 rounded-full bg-green-600/80 backdrop-blur-sm">
            <Play className="h-10 w-10 text-white" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VideoPreview;
