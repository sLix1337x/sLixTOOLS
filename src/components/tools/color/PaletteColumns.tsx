import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Copy, GripVertical, Info, Layers, Lock, LockOpen, Pipette, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks';
import { copyWithToast } from '@/utils/clipboard';
import { nearestColorName } from '@/utils/colorNames';
import {
  hexToRgb,
  MIN_SLOTS,
  readableText,
  rgbToCmyk,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  shadeRamp,
} from '@/utils/colorScheme';
import type { Slot } from '@/utils/colorScheme';

type PanelKind = 'shades' | 'info';

interface PaletteColumnsProps {
  slots: Slot[];
  baseId: number;
  /** Blocks every edit while the adjust preview is open. */
  disabled: boolean;
  canRemove: boolean;
  canAdd: boolean;
  onReorder: (slots: Slot[]) => void;
  /** Adds a color in front of the slot at this index. */
  onInsert: (index: number) => void;
  onToggleLock: (id: number) => void;
  onRemove: (id: number) => void;
  onChange: (id: number, hex: string) => void;
  /** Rendered directly below the columns, above any open panel. */
  children?: ReactNode;
}

const columnAction =
  'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors enabled:hover:bg-black/15 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-current';

const percent = (value: number) => Math.round(value * 100);

const colorFormats = (hex: string): [string, string][] => {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb);
  const hsl = rgbToHsl(rgb);
  const cmyk = rgbToCmyk(rgb);
  const lab = rgbToLab(rgb);
  return [
    ['HEX', hex.toUpperCase()],
    ['RGB', `${rgb.r}, ${rgb.g}, ${rgb.b}`],
    ['HSB', `${Math.round(hsv.h)}, ${percent(hsv.s)}%, ${percent(hsv.v)}%`],
    ['HSL', `${Math.round(hsl.h)}, ${percent(hsl.s)}%, ${percent(hsl.l)}%`],
    ['CMYK', `${percent(cmyk.c)}, ${percent(cmyk.m)}, ${percent(cmyk.y)}, ${percent(cmyk.k)}`],
    ['LAB', `${Math.round(lab.l)}, ${Math.round(lab.a)}, ${Math.round(lab.b)}`],
  ];
};

interface ColumnProps extends Omit<PaletteColumnsProps, 'slots' | 'baseId' | 'canAdd' | 'onReorder' | 'onInsert' | 'children'> {
  slot: Slot;
  isBase: boolean;
  axis: 'x' | 'y';
  /** Actions stay visible while their panel is open. */
  panel: PanelKind | null;
  onPanel: (kind: PanelKind) => void;
  onMove: (delta: number) => void;
  onInsertBefore: (() => void) | null;
}

const Column = ({
  slot,
  isBase,
  axis,
  panel,
  disabled,
  canRemove,
  onToggleLock,
  onRemove,
  onChange,
  onPanel,
  onMove,
  onInsertBefore,
}: ColumnProps) => {
  const dragControls = useDragControls();
  const hex = slot.hex.toUpperCase();

  const handleMoveKey = (e: KeyboardEvent) => {
    const delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    onMove(delta);
  };

  return (
    <Reorder.Item
      value={slot}
      axis={axis}
      layout="position"
      dragListener={false}
      dragControls={dragControls}
      className="group relative flex min-w-0 flex-1 items-center justify-between gap-2 p-3 [container-type:inline-size] md:flex-col-reverse md:justify-start md:gap-3 md:px-1 md:py-5"
      style={{ backgroundColor: slot.hex, color: readableText(slot.hex) }}
    >
      {/* Sits in the later column, which paints above the earlier one, so it can straddle the shared edge */}
      {onInsertBefore && (
        <div className="group/insert absolute inset-y-0 left-0 z-10 hidden w-8 -translate-x-1/2 items-center justify-center md:flex">
          <Tooltip label="Add color" hint="Inserts a mix of the two neighbors">
            <button
              type="button"
              onClick={onInsertBefore}
              className="flex h-9 w-9 shrink-0 items-center justify-center !rounded-full bg-slate-900 text-sky-300 shadow-lg transition-opacity enabled:hover:bg-slate-800 enabled:hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 [@media(hover:hover)]:opacity-0 group-hover/insert:opacity-100 focus-visible:opacity-100"
              aria-label={`Add color before ${hex}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      )}

      <div className="min-w-0 shrink-0 md:w-full md:text-center">
        <button
          type="button"
          onClick={() => void copyWithToast(hex)}
          className="block font-mono text-[length:min(1.25rem,22cqi)] font-bold tracking-wide hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-current md:mx-auto"
          aria-label={`Copy ${hex}`}
        >
          {hex}
        </button>
        <p className="mt-0 truncate text-xs opacity-80">{nearestColorName(slot.hex)}</p>
        {/* Reserved on every desktop column so the hex values stay on one line */}
        <p className={`mt-0 text-[11px] font-semibold uppercase tracking-wide opacity-80 ${isBase ? '' : 'hidden md:invisible md:block'}`}>
          Base
        </p>
      </div>

      {/* Hover only hides the actions where a real hover exists, so touch keeps them visible */}
      <div
        className={`flex flex-wrap items-center justify-end gap-0.5 transition-opacity md:flex-col md:justify-start ${
          panel ? '' : '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <Tooltip
          label={slot.locked ? 'Unlock color' : 'Lock color'}
          hint={slot.locked ? 'Generate can replace it again' : 'Stays when you generate'}
        >
          <button
            type="button"
            className={columnAction}
            disabled={disabled}
            onClick={() => onToggleLock(slot.id)}
            aria-pressed={slot.locked}
            aria-label={slot.locked ? `Unlock ${hex}` : `Lock ${hex}`}
          >
            {slot.locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <LockOpen className="h-4 w-4" aria-hidden="true" />}
          </button>
        </Tooltip>
        <Tooltip label="Copy hex" hint={hex}>
          <button type="button" className={columnAction} onClick={() => void copyWithToast(hex)} aria-label={`Copy ${hex}`}>
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Change color" hint="Opens the color picker">
          <label
            className={`${columnAction} focus-within:outline focus-within:outline-2 focus-within:outline-current ${
              disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-black/15'
            }`}
          >
            <Pipette className="h-4 w-4" aria-hidden="true" />
            <input
              type="color"
              className="sr-only"
              value={slot.hex}
              disabled={disabled}
              onChange={(e) => onChange(slot.id, e.target.value)}
              aria-label={`Change ${hex}`}
            />
          </label>
        </Tooltip>
        <Tooltip label="Shades" hint="Lighter and darker steps of this color">
          <button
            type="button"
            className={columnAction}
            onClick={() => onPanel('shades')}
            aria-pressed={panel === 'shades'}
            aria-label={`Show shades of ${hex}`}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Color values" hint="RGB, HSB, HSL, CMYK and LAB">
          <button
            type="button"
            className={columnAction}
            onClick={() => onPanel('info')}
            aria-pressed={panel === 'info'}
            aria-label={`Show color values of ${hex}`}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Remove" hint={canRemove ? undefined : `A palette needs at least ${MIN_SLOTS} colors`}>
          <button
            type="button"
            className={columnAction}
            disabled={disabled || !canRemove}
            onClick={() => onRemove(slot.id)}
            aria-label={`Remove ${hex}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip label="Drag to reorder" hint="Or focus it and use the arrow keys">
          <button
            type="button"
            className={`${columnAction} touch-none enabled:cursor-grab`}
            disabled={disabled}
            onPointerDown={(e) => dragControls.start(e)}
            onKeyDown={handleMoveKey}
            aria-label={`Move ${hex}. Use the arrow keys.`}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </Reorder.Item>
  );
};

const PanelFrame = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="mx-4 my-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="mt-0 text-sm font-medium text-white">{title}</p>
      <button type="button" onClick={onClose} className="text-xs text-slate-300 underline hover:text-white">
        Close
      </button>
    </div>
    {children}
  </div>
);

/** Shades and info sit below the columns, because stacked rows on phones are too short to hold them. */
const SlotPanel = ({ slot, kind, onClose }: { slot: Slot; kind: PanelKind; onClose: () => void }) => {
  const name = `${slot.hex.toUpperCase()} (${nearestColorName(slot.hex)})`;
  if (kind === 'info') {
    return (
      <PanelFrame title={`Color values of ${name}`} onClose={onClose}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {colorFormats(slot.hex).map(([format, value]) => (
            <button
              key={format}
              type="button"
              onClick={() => void copyWithToast(value)}
              className="flex items-center justify-between gap-3 rounded-md bg-white/[0.05] px-3 py-2 text-sm hover:bg-sky-400/15"
              aria-label={`Copy ${format} ${value}`}
            >
              <span className="font-semibold text-slate-300">{format}</span>
              <span className="font-mono text-white">{value}</span>
            </button>
          ))}
        </div>
      </PanelFrame>
    );
  }
  return (
    <PanelFrame title={`Shades of ${name}. Click one to copy it.`} onClose={onClose}>
      <div className="grid grid-cols-7 overflow-hidden rounded-md sm:grid-cols-[repeat(21,minmax(0,1fr))]">
        {shadeRamp(slot.hex).map((shade, i) => (
          <Tooltip key={`${i}-${shade}`} label={shade.toUpperCase()} hint="Click to copy">
            <button
              type="button"
              onClick={() => void copyWithToast(shade.toUpperCase())}
              className="h-12 outline-offset-[-2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
              style={{ backgroundColor: shade }}
              aria-label={`Copy ${shade.toUpperCase()}`}
            />
          </Tooltip>
        ))}
      </div>
    </PanelFrame>
  );
};

const PaletteColumns = ({ slots, baseId, canAdd, onReorder, onInsert, children, ...actions }: PaletteColumnsProps) => {
  const isMobile = useIsMobile();
  const [panel, setPanel] = useState<{ id: number; kind: PanelKind } | null>(null);
  const panelSlot = slots.find((slot) => slot.id === panel?.id);

  const moveSlot = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= slots.length) return;
    const next = [...slots];
    [next[from], next[to]] = [next[to], next[from]];
    onReorder(next);
  };

  return (
    <>
      <Reorder.Group
        axis={isMobile ? 'y' : 'x'}
        values={slots}
        onReorder={onReorder}
        className="flex flex-col overflow-hidden md:min-h-64 md:flex-1 md:flex-row"
      >
        {slots.map((slot, i) => (
          <Column
            key={slot.id}
            slot={slot}
            isBase={slot.id === baseId}
            axis={isMobile ? 'y' : 'x'}
            panel={panel?.id === slot.id ? panel.kind : null}
            onPanel={(kind) =>
              setPanel((open) => (open?.id === slot.id && open.kind === kind ? null : { id: slot.id, kind }))
            }
            onMove={(delta) => moveSlot(i, delta)}
            onInsertBefore={i > 0 && canAdd && !actions.disabled ? () => onInsert(i) : null}
            {...actions}
          />
        ))}
      </Reorder.Group>
      {children}
      {panel && panelSlot && <SlotPanel slot={panelSlot} kind={panel.kind} onClose={() => setPanel(null)} />}
    </>
  );
};

export default PaletteColumns;
