import { Slider } from '@/components/ui/slider';

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean | undefined;
}

/** Labeled quality slider for a tool's top row. */
const QualitySlider = ({ value, onChange, min, max, step, disabled = false }: QualitySliderProps) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400">Quality</span>
    <Slider
      aria-label="Quality"
      value={[value]}
      onValueChange={([next]) => onChange(next ?? value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="w-32 lg:w-40"
    />
    <span className="w-9 text-right font-mono text-[11px] tabular-nums text-slate-200">{value}%</span>
  </div>
);

export default QualitySlider;
