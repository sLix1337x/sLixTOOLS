import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Download, Crop, RotateCw, Rewind, Zap, Type, Maximize } from 'lucide-react';
import { GifResult } from '@/types';

interface PostConversionOptionsProps {
  gifResult: GifResult;
  onDownload: () => void;
  onEdit: (editType: string, params?: any) => void;
}

const PostConversionOptions: React.FC<PostConversionOptionsProps> = ({ 
  gifResult, 
  onDownload, 
  onEdit 
}) => {
  const [showEditOptions, setShowEditOptions] = useState(false);
  const [cropParams, setCropParams] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [resizeParams, setResizeParams] = useState({ width: 480, height: 360 });
  const [speedMultiplier, setSpeedMultiplier] = useState([1]);
  const [textParams, setTextParams] = useState({ text: '', x: 50, y: 50, fontSize: 24, color: '#ffffff' });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* File Info */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-400 mb-2">GIF Created Successfully!</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">File Size: </span>
            <span className="text-white font-semibold">{formatFileSize(gifResult.size || 0)}</span>
          </div>
          <div>
            <span className="text-gray-400">Dimensions: </span>
            <span className="text-white font-semibold">{gifResult.width || 'N/A'} × {gifResult.height || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={onDownload}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download GIF
        </Button>
        
        <Button 
          onClick={() => setShowEditOptions(!showEditOptions)}
          variant="outline"
          className="border-blue-500 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2"
        >
          <Type className="w-4 h-4" />
          Edit GIF
        </Button>
      </div>

      {/* Edit Options */}
      {showEditOptions && (
        <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6 space-y-6">
          <h4 className="text-lg font-semibold text-blue-400 mb-4">Edit Options</h4>
          
          {/* Crop */}
          <div className="space-y-3">
            <Label className="text-green-300 flex items-center gap-2">
              <Crop className="w-4 h-4" />
              Crop GIF
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <Input 
                type="number" 
                placeholder="X" 
                value={cropParams.x}
                onChange={(e) => setCropParams({...cropParams, x: parseInt(e.target.value) || 0})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Y" 
                value={cropParams.y}
                onChange={(e) => setCropParams({...cropParams, y: parseInt(e.target.value) || 0})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Width" 
                value={cropParams.width}
                onChange={(e) => setCropParams({...cropParams, width: parseInt(e.target.value) || 100})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Height" 
                value={cropParams.height}
                onChange={(e) => setCropParams({...cropParams, height: parseInt(e.target.value) || 100})}
                className="bg-black/50 border-gray-600"
              />
            </div>
            <Button 
              onClick={() => onEdit('crop', cropParams)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Crop
            </Button>
          </div>

          {/* Resize */}
          <div className="space-y-3">
            <Label className="text-green-300 flex items-center gap-2">
              <Maximize className="w-4 h-4" />
              Resize GIF
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input 
                type="number" 
                placeholder="Width" 
                value={resizeParams.width}
                onChange={(e) => setResizeParams({...resizeParams, width: parseInt(e.target.value) || 480})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Height" 
                value={resizeParams.height}
                onChange={(e) => setResizeParams({...resizeParams, height: parseInt(e.target.value) || 360})}
                className="bg-black/50 border-gray-600"
              />
            </div>
            <Button 
              onClick={() => onEdit('resize', resizeParams)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Resize
            </Button>
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
            <Label className="text-green-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Change Speed (×{speedMultiplier[0]})
            </Label>
            <Slider 
              min={0.25} 
              max={4} 
              step={0.25}
              value={speedMultiplier} 
              onValueChange={setSpeedMultiplier}
              className="cursor-pointer [&>span:first-child]:h-2 [&>span:first-child]:bg-blue-900/50 [&>span:first-child_span]:bg-blue-400 [&>span:first-child_span]:border-2 [&>span:first-child_span]:border-blue-400 [&>span:first-child_span]:w-5 [&>span:first-child_span]:h-5 [&>span:first-child_span]:-mt-1.5" 
            />
            <Button 
              onClick={() => onEdit('speed', { multiplier: speedMultiplier[0] })}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Speed Change
            </Button>
          </div>

          {/* Add Text */}
          <div className="space-y-3">
            <Label className="text-green-300 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Add Text
            </Label>
            <Textarea 
              placeholder="Enter text to add to GIF"
              value={textParams.text}
              onChange={(e) => setTextParams({...textParams, text: e.target.value})}
              className="bg-black/50 border-gray-600"
            />
            <div className="grid grid-cols-4 gap-2">
              <Input 
                type="number" 
                placeholder="X Position" 
                value={textParams.x}
                onChange={(e) => setTextParams({...textParams, x: parseInt(e.target.value) || 50})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Y Position" 
                value={textParams.y}
                onChange={(e) => setTextParams({...textParams, y: parseInt(e.target.value) || 50})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="number" 
                placeholder="Font Size" 
                value={textParams.fontSize}
                onChange={(e) => setTextParams({...textParams, fontSize: parseInt(e.target.value) || 24})}
                className="bg-black/50 border-gray-600"
              />
              <Input 
                type="color" 
                value={textParams.color}
                onChange={(e) => setTextParams({...textParams, color: e.target.value})}
                className="bg-black/50 border-gray-600 h-10"
              />
            </div>
            <Button 
              onClick={() => onEdit('text', textParams)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Text
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => onEdit('rotate', { degrees: 90 })}
              size="sm"
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500/10 flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              Rotate 90°
            </Button>
            
            <Button 
              onClick={() => onEdit('reverse')}
              size="sm"
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10 flex items-center gap-2"
            >
              <Rewind className="w-4 h-4" />
              Reverse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostConversionOptions;