import { Plus } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { sectionLabel } from '@/styles/constants';
import { copyWithToast } from '@/utils/clipboard';
import { readableText, TONE_NAMES } from '@/utils/colorScheme';
import type { HueGroup } from '@/utils/colorScheme';

interface HarmonyGridProps {
  groups: HueGroup[];
  canAdd: boolean;
  onAdd: (hex: string) => void;
}

const offsetLabel = (offset: number) => (offset === 0 ? 'Base' : `${offset > 0 ? '+' : ''}${offset}°`);

const HarmonyGrid = ({ groups, canAdd, onAdd }: HarmonyGridProps) => (
  <div>
    <h2 className={`${sectionLabel} mb-2`}>Harmony</h2>
    <div className="grid grid-cols-[2.75rem_repeat(4,minmax(0,1fr))] gap-1">
      <span />
      {TONE_NAMES.map((tone) => (
        <span key={tone} className="text-center text-xs text-slate-300">
          {tone}
        </span>
      ))}
      {groups.map((group) => (
        <div key={group.offset} className="contents">
          <span className="self-center text-xs text-slate-300">{offsetLabel(group.offset)}</span>
          {group.tones.map((hex, tone) => (
            <div
              key={TONE_NAMES[tone]}
              className="relative flex h-14 items-center justify-center rounded-md"
              style={{ backgroundColor: hex, color: readableText(hex) }}
            >
              <button
                type="button"
                onClick={() => void copyWithToast(hex.toUpperCase())}
                className="h-full w-full rounded-md font-mono text-[11px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-current sm:text-xs"
                aria-label={`Copy ${hex.toUpperCase()}`}
              >
                {hex.toUpperCase()}
              </button>
              <Tooltip label="Add to palette">
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => onAdd(hex)}
                  className="absolute right-0.5 top-0.5 rounded p-0.5 enabled:hover:bg-black/15 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                  aria-label={`Add ${hex.toUpperCase()} to the palette`}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default HarmonyGrid;
