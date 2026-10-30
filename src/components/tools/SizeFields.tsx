import { useId } from 'react';
import { Link2, Unlink2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { fieldClass, toolButton } from '@/styles/constants';

interface SizeFieldsProps {
  width: number;
  height: number;
  max: number;
  locked: boolean;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onLockedChange: (locked: boolean) => void;
}

const inputClass = cn(fieldClass, 'w-20 px-2 text-center tabular-nums');

/** Width and height inputs with the aspect ratio lock, for a tool's top row. */
const SizeFields = ({ width, height, max, locked, onWidthChange, onHeightChange, onLockedChange }: SizeFieldsProps) => {
  const id = useId();
  const LockIcon = locked ? Link2 : Unlink2;

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <label htmlFor={`${id}-width`}>W</label>
      <input
        id={`${id}-width`}
        type="number"
        aria-label="Width in pixels"
        value={width || ''}
        onChange={(e) => onWidthChange(Number(e.target.value))}
        min="1"
        max={max}
        className={inputClass}
      />
      <span aria-hidden="true">×</span>
      <label htmlFor={`${id}-height`}>H</label>
      <input
        id={`${id}-height`}
        type="number"
        aria-label="Height in pixels"
        value={height || ''}
        onChange={(e) => onHeightChange(Number(e.target.value))}
        min="1"
        max={max}
        className={inputClass}
      />
      <span>px</span>
      <Tooltip
        label="Keep aspect ratio"
        hint={locked ? 'Changing one side updates the other.' : 'Both sides change independently.'}
        side="bottom"
      >
        <button
          type="button"
          aria-pressed={locked}
          onClick={() => onLockedChange(!locked)}
          aria-label="Keep aspect ratio"
          className={toolButton}
        >
          <LockIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
};

export default SizeFields;
