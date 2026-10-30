import { Slider } from '@/components/ui/slider';
import { sectionLabel } from '@/styles/constants';

interface SettingSliderProps {
  label: string;
  value: number;
  /** Current value as shown to the user, with its unit */
  valueText: string;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string | undefined;
  disabled?: boolean | undefined;
}

/** Labeled slider for a tool's settings column. */
const SettingSlider = ({ label, value, valueText, onChange, min, max, step, hint, disabled = false }: SettingSliderProps) => (
  <div className="space-y-2">
    <div className="flex items-baseline justify-between gap-2">
      <span className={sectionLabel}>{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-slate-200">{valueText}</span>
    </div>
    <Slider
      aria-label={label}
      value={[value]}
      onValueChange={([next]) => onChange(next ?? value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
    {hint && <p className="mt-0 text-xs text-slate-400">{hint}</p>}
  </div>
);

export default SettingSlider;
