import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { toolButton } from '@/styles/constants';

interface SourceChipProps {
  /** Image thumbnail; falls back to `icon` for files that have none. */
  thumbnail?: string | null | undefined;
  icon?: LucideIcon | undefined;
  name: string;
  meta: string;
  onRemove: () => void;
  disabled?: boolean | undefined;
}

/** Loaded file in a tool's top row, with the way back to the upload area. */
const SourceChip = ({ thumbnail, icon: Icon, name, meta, onRemove, disabled = false }: SourceChipProps) => (
  <div className="flex min-w-0 items-center gap-2">
    {thumbnail ? (
      <img src={thumbnail} alt="" className="h-9 w-9 flex-shrink-0 rounded-md border border-white/10 object-cover" />
    ) : Icon ? (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-sky-400/10 text-sky-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    ) : null}
    <div className="min-w-0 max-w-40">
      <p className="mt-0 truncate text-xs font-medium text-white" title={name}>
        {name}
      </p>
      <p className="mt-0 truncate text-[11px] text-slate-400">{meta}</p>
    </div>
    <Tooltip label="Remove file" hint="Back to the upload area." side="bottom">
      <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${name}`} className={toolButton}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </Tooltip>
  </div>
);

export default SourceChip;
