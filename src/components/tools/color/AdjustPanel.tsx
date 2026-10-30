import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { chipButton, sectionLabel } from '@/styles/constants';
import type { Adjustments } from '@/utils/colorScheme';

interface AdjustPanelProps {
  value: Adjustments;
  onChange: (value: Adjustments) => void;
  onApply: () => void;
  onCancel: () => void;
}

const SLIDERS: { key: keyof Adjustments; label: string; min: number; max: number }[] = [
  { key: 'hue', label: 'Hue', min: -180, max: 180 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
];

const AdjustPanel = ({ value, onChange, onApply, onCancel }: AdjustPanelProps) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className={sectionLabel}>Adjust</h2>
        <p className="mt-0 text-xs text-slate-300">Previews on unlocked colors. Other edits wait until you apply or cancel.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={chipButton} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-9 items-center rounded-lg bg-primary-action px-4 text-sm font-medium text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-all hover:bg-primary-action/90 hover:shadow-[0_0_25px_rgba(56,189,248,0.7)]"
        >
          Apply
        </button>
      </div>
    </div>
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {SLIDERS.map(({ key, label, min, max }) => (
        <div key={key}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <Label className="text-slate-200">{label}</Label>
            <span className="font-mono text-slate-300">{value[key]}</span>
          </div>
          <Slider
            value={[value[key]]}
            min={min}
            max={max}
            step={1}
            onValueChange={([next]) => onChange({ ...value, [key]: next })}
            aria-label={label}
          />
        </div>
      ))}
    </div>
  </div>
);

export default AdjustPanel;
