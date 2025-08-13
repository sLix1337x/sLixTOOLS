
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConversionOptions } from '@/utils/gifConverter';
import { Settings } from 'lucide-react';

interface ConversionOptionsProps {
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
  videoFile: File | null;
  videoDuration?: number; // Add video duration prop
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const estimateGifSize = (width: number, height: number, fps: number, duration: number, quality: number): number => {
  // Rough estimation formula for GIF file size
  const frames = fps * duration;
  const pixelsPerFrame = width * height;
  const bytesPerPixel = Math.max(0.1, 1 - (quality / 20)); // Quality affects compression
  return frames * pixelsPerFrame * bytesPerPixel;
};

// Extend Switch component props to include thumbClassName
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    thumbClassName?: string;
  }
}

const ConversionOptionsForm: React.FC<ConversionOptionsProps> = ({ options, onChange, videoFile, videoDuration = 0 }) => {
  // Calculate estimated file size
  const getEstimatedSize = () => {
    const width = options.width || 480;
    const height = options.height || 360;
    const duration = options.endTime ? (options.endTime - (options.startTime || 0)) : (options.duration || videoDuration || 5);
    return estimateGifSize(width, height, options.fps || 10, duration, options.quality || 10);
  };
  const handleFpsChange = (value: number[]) => {
    onChange({ ...options, fps: value[0] });
  };
  
  const handleQualityChange = (value: number[]) => {
    onChange({ ...options, quality: value[0] });
  };
  
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    
    if (!isNaN(numValue)) {
      onChange({ 
        ...options, 
        [name]: numValue 
      });
    } else if (value === '') {
      onChange({
        ...options,
        [name]: undefined
      });
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...options,
      startTime: isNaN(value) ? 0 : value
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...options,
      duration: isNaN(value) ? undefined : value
    });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...options,
      endTime: isNaN(value) ? undefined : value
    });
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Settings className="w-6 h-6 mr-2 text-green-400" />
          <h3 className="text-2xl font-bold">CONVERSION OPTIONS</h3>
        </div>
        {videoFile && (
          <div className="text-sm text-gray-400">
            Original Size: <span className="text-blue-400 font-semibold">{formatFileSize(videoFile.size)}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="space-y-2 bg-black/50 p-4 border border-gray-600/50">
          <div className="flex justify-between mb-2">
            <Label htmlFor="fps" className="text-green-300 text-lg">
              FRAMES PER SECOND:
            </Label>
            <span className="text-blue-400 font-bold">{options.fps} FPS</span>
          </div>
          <div className="px-2">
            <Slider 
              id="fps"
              min={1} 
              max={30} 
              step={1}
              value={[options.fps || 10]} 
              onValueChange={handleFpsChange}
              className="cursor-pointer [&>span:first-child]:h-2 [&>span:first-child]:bg-green-900/50 [&>span:first-child_span]:bg-green-400 [&>span:first-child_span]:border-2 [&>span:first-child_span]:border-green-400 [&>span:first-child_span]:w-5 [&>span:first-child_span]:h-5 [&>span:first-child_span]:-mt-1.5" 
            />
          </div>
          <p className="text-sm text-green-300/80 mt-2">HIGHER FPS = SMOOTHER ANIMATION BUT LARGER FILE SIZE</p>
        </div>

        <div className="space-y-2 bg-black/50 p-4 border border-gray-600/50">
          <div className="flex justify-between mb-2">
            <Label htmlFor="quality" className="text-green-300 text-lg">
              QUALITY: {options.quality}%
            </Label>
            <span className="text-yellow-400 font-semibold text-sm">EST. SIZE: {formatFileSize(getEstimatedSize())}</span>
          </div>
          <div className="px-2">
            <Slider 
              id="quality"
              min={1} 
              max={20} 
              step={1}
              value={[options.quality || 10]} 
              onValueChange={handleQualityChange}
              className="cursor-pointer [&>span:first-child]:h-2 [&>span:first-child]:bg-green-900/50 [&>span:first-child_span]:bg-green-400 [&>span:first-child_span]:border-2 [&>span:first-child_span]:border-green-400 [&>span:first-child_span]:w-5 [&>span:first-child_span]:h-5 [&>span:first-child_span]:-mt-1.5" 
            />
          </div>
          <p className="text-sm text-green-300/80 mt-2">LOWER VALUES = BETTER QUALITY BUT LARGER FILE SIZE</p>
        </div>

        <div className="space-y-4 bg-black/50 p-4 border border-gray-600/50">
          <h4 className="text-green-300 text-lg font-semibold">TIME CONTROLS:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-green-300 text-sm">
                START TIME (SECONDS):
              </Label>
              <Input
                id="startTime"
                type="number"
                min="0"
                step="0.1"
                value={options.startTime || ''}
                onChange={handleStartTimeChange}
                className="bg-black/50 border border-gray-600/50 text-green-300 focus:border-green-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-green-300 text-sm">
                END TIME (SECONDS):
              </Label>
              <Input
                id="endTime"
                type="number"
                min="0.1"
                step="0.1"
                value={options.endTime || ''}
                onChange={handleEndTimeChange}
                className="bg-black/50 border border-gray-600/50 text-green-300 focus:border-green-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Full video length"
              />
            </div>
          </div>
          
          {videoDuration > 0 && (
            <div className="text-sm text-green-300/80 italic">
              VIDEO DURATION: {formatDuration(videoDuration)}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
          <div>
            <Label htmlFor="width" className="text-gray-300 mb-1 block">Width (px)</Label>
            <Input
              id="width"
              name="width"
              type="number"
              placeholder="Auto"
              value={options.width || ''}
              onChange={handleSizeChange}
              className="bg-gray-800/50 border-gray-700 text-gray-200"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-gray-300 mb-1 block">Height (px)</Label>
            <Input
              id="height"
              name="height"
              type="number"
              placeholder="Auto"
              value={options.height || ''}
              onChange={handleSizeChange}
              className="bg-gray-800/50 border-gray-700 text-gray-200"
            />
          </div>
          <p className="text-xs text-gray-400 col-span-2">Smaller dimensions = faster conversion & smaller file size</p>
        </div>
      </div>
    </div>
  );
};

const ConversionOptionsComponent = ConversionOptionsForm;

export default ConversionOptionsComponent;
export { ConversionOptionsForm, ConversionOptionsComponent };
