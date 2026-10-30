
import React, { useEffect, useState } from 'react';
import SettingSlider from '@/components/tools/SettingSlider';
import { config } from '@/config';
import { cn } from '@/lib/utils';
import { fieldClass, sectionLabel } from '@/styles/constants';
import type { ConversionOptions } from '@/types';
import { formatDuration, formatFileSize } from '@/utils/formatters';
import { convertVideoToGif } from '@/utils/gifConverter';

interface ConversionOptionsProps {
  videoFile: File;
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
  videoDuration?: number; // Add video duration prop
  disabled?: boolean;
}

// Frames encoded for the size estimate
const SAMPLE_FRAMES = 12;

/** GIF size depends on the picture, so encode a few frames from the middle of the clip and scale up. */
const useGifSizeEstimate = (videoFile: File, options: ConversionOptions, videoDuration: number, paused: boolean) => {
  const [estimate, setEstimate] = useState<number | null>(null);
  const { fps, quality, width = 0, height = 0, startTime } = options;
  const endTime = Math.min(options.endTime || videoDuration, videoDuration);

  useEffect(() => {
    if (paused) return;
    const clip = endTime - startTime;
    if (clip <= 0) {
      setEstimate(null);
      return;
    }
    const sample = Math.min(clip, SAMPLE_FRAMES / fps);
    let stale = false;
    // ponytail: gif.js has no abort, so samples can overlap when settings change mid-run
    const timer = setTimeout(async () => {
      try {
        const blob = await convertVideoToGif(videoFile, {
          fps,
          quality,
          width,
          height,
          startTime: startTime + (clip - sample) / 2,
          duration: sample,
          trimEnabled: true,
        });
        if (!stale) setEstimate(blob.size * (clip / sample));
      } catch {
        if (!stale) setEstimate(null);
      }
    }, 500);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [videoFile, fps, quality, width, height, startTime, endTime, paused]);

  return estimate;
};

const NumberField = ({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs text-slate-400">
      {label}
    </label>
    <input id={id} type="number" className={fieldClass} {...props} />
  </div>
);

/** Settings for a settings column; the fragment keeps the column's spacing. */
const ConversionOptionsForm = ({ videoFile, options, onChange, videoDuration = 0, disabled = false }: ConversionOptionsProps) => {
  const estimatedSize = useGifSizeEstimate(videoFile, options, videoDuration, disabled);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);

    const newOptions = { ...options };

    if (!isNaN(numValue)) {
      (newOptions as Record<string, number | boolean>)[name] = numValue;
    } else if (value === '') {
      delete (newOptions as Record<string, number | boolean>)[name];
    }

    onChange(newOptions);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...options,
      startTime: isNaN(value) ? 0 : value
    });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newOptions = { ...options };

    if (isNaN(value)) {
      delete newOptions.endTime;
    } else {
      newOptions.endTime = value;
    }

    onChange(newOptions);
  };

  return (
    <>
      <SettingSlider
        label="Frame rate"
        value={options.fps || 10}
        valueText={`${options.fps} fps`}
        onChange={(fps) => onChange({ ...options, fps })}
        min={1}
        max={30}
        step={1}
        hint="Higher = smoother animation, larger file"
        disabled={disabled}
      />
      <SettingSlider
        label="Quality"
        value={options.quality || 10}
        valueText={String(options.quality)}
        onChange={(quality) => onChange({ ...options, quality })}
        min={1}
        max={20}
        step={1}
        hint="Lower = better colors, slower conversion"
        disabled={disabled}
      />
      <div className="space-y-2">
        <p className={cn(sectionLabel, 'mt-0')}>Clip</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="startTime"
            label="Start (seconds)"
            min="0"
            step="0.1"
            value={options.startTime || ''}
            onChange={handleStartTimeChange}
            placeholder="0"
          />
          <NumberField
            id="endTime"
            label="End (seconds)"
            min="0.1"
            step="0.1"
            value={options.endTime || ''}
            onChange={handleEndTimeChange}
            placeholder="Video end"
          />
        </div>
        <p className="mt-0 text-xs text-slate-400">
          {videoDuration > 0 && `Video length: ${formatDuration(videoDuration)}. `}
          GIFs can be up to {config.gif.maxDuration} seconds long.
        </p>
      </div>
      <div className="space-y-2">
        <p className={cn(sectionLabel, 'mt-0')}>Size</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="width"
            name="width"
            label="Width (px)"
            placeholder="Auto"
            value={options.width || ''}
            onChange={handleSizeChange}
          />
          <NumberField
            id="height"
            name="height"
            label="Height (px)"
            placeholder="Auto"
            value={options.height || ''}
            onChange={handleSizeChange}
          />
        </div>
        <p className="mt-0 text-xs text-slate-400">Smaller dimensions = faster conversion, smaller file</p>
      </div>
      <p className="mt-0 text-xs text-slate-400">
        Estimated size: <span className="tabular-nums text-slate-200">{estimatedSize === null ? '-' : `~${formatFileSize(estimatedSize)}`}</span>
      </p>
    </>
  );
};

export default ConversionOptionsForm;
