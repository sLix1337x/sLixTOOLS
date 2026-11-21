import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { EQ_FREQS, EQ_Q, eqResponse, type EqGains } from '@/utils/audioEdit';

type Band = keyof EqGains;
export interface EqPatch {
  eq: EqGains;
  eqFreq: EqGains;
  eqQ: number;
}
interface EqCurveProps extends EqPatch {
  onChange: (patch: Partial<EqPatch>) => void;
  disabled?: boolean | undefined;
}

const MIN_F = 20;
const MAX_F = 20000;
const MAX_DB = 12;
/** dB from the center line to the top edge; a little headroom above the max boost */
const VIEW_DB = 15;
const W = 240;
const H = 120;
const BANDS: { band: Band; label: string; color: string; fill: string }[] = [
  { band: 'low', label: 'Low', color: 'text-amber-300', fill: 'bg-amber-300' },
  { band: 'mid', label: 'Mid', color: 'text-sky-300', fill: 'bg-sky-300' },
  { band: 'high', label: 'High', color: 'text-violet-300', fill: 'bg-violet-300' },
];
const GRID_F = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** 0..1 across the graph, log scale */
const xOf = (f: number) => Math.log(f / MIN_F) / Math.log(MAX_F / MIN_F);
const fOf = (x: number) => MIN_F * (MAX_F / MIN_F) ** clamp(x, 0, 1);
const yOf = (db: number) => 0.5 - db / (2 * VIEW_DB);
const roundF = (f: number) => (f < 1000 ? Math.round(f) : Math.round(f / 10) * 10);
const roundDb = (db: number) => clamp(Math.round(db * 2) / 2, -MAX_DB, MAX_DB);
const fText = (f: number) => (f >= 1000 ? `${+(f / 1000).toFixed(2)} kHz` : `${f} Hz`);
const dbText = (db: number) => `${db > 0 ? '+' : ''}${db} dB`;

/** Draggable 3-band EQ: drag a dot (or anywhere: the nearest dot jumps there) to set its frequency and gain. */
const EqCurve = ({ eq, eqFreq, eqQ, onChange, disabled = false }: EqCurveProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Band | null>(null);

  const setBand = (band: Band, f: number, db: number) =>
    onChange({
      eq: { ...eq, [band]: roundDb(db) },
      eqFreq: { ...eqFreq, [band]: roundF(clamp(f, MIN_F, MAX_F)) },
    });
  const fromPointer = (band: Band, e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setBand(band, fOf(x), (0.5 - y) * 2 * VIEW_DB);
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const own = (e.target as HTMLElement).dataset.band as Band | undefined;
    const band =
      own ??
      BANDS.reduce((a, b) =>
        Math.abs(xOf(eqFreq[b.band]) - x) < Math.abs(xOf(eqFreq[a.band]) - x) ? b : a
      ).band;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(band);
    if (!own) fromPointer(band, e);
  };
  const onMove = (e: React.PointerEvent) => dragging && fromPointer(dragging, e);
  const onUp = () => setDragging(null);

  // Wheel over the mid dot sets its width. Native listener: React's wheel handler can't preventDefault.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    if (disabled || (e.target as HTMLElement).dataset.band !== 'mid') return;
    e.preventDefault();
    onChange({ eqQ: clamp(Math.round(eqQ * (e.deltaY < 0 ? 1.15 : 1 / 1.15) * 10) / 10, 0.3, 6) });
  };
  useEffect(() => {
    const box = boxRef.current;
    const onWheel = (e: WheelEvent) => wheelRef.current(e);
    box?.addEventListener('wheel', onWheel, { passive: false });
    return () => box?.removeEventListener('wheel', onWheel);
  }, []);

  const onKey = (band: Band, e: React.KeyboardEvent) => {
    const big = e.shiftKey;
    const f = eqFreq[band];
    const db = eq[band];
    const step = {
      ArrowUp: [f, db + (big ? 3 : 0.5)],
      ArrowDown: [f, db - (big ? 3 : 0.5)],
      ArrowRight: [f * (big ? 1.25 : 1.05), db],
      ArrowLeft: [f / (big ? 1.25 : 1.05), db],
    }[e.key];
    if (!step) return;
    e.preventDefault();
    setBand(band, step[0], step[1]);
  };
  const reset = (band: Band) =>
    onChange({
      eq: { ...eq, [band]: 0 },
      eqFreq: { ...eqFreq, [band]: EQ_FREQS[band] },
      ...(band === 'mid' ? { eqQ: EQ_Q } : {}),
    });

  const points = Array.from({ length: 121 }, (_, i) => {
    const x = i / 120;
    const db = clamp(eqResponse(eq, eqFreq, eqQ, fOf(x)), -VIEW_DB, VIEW_DB);
    return `${(x * W).toFixed(1)},${(yOf(db) * H).toFixed(1)}`;
  });

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className={cn(
          'relative h-32 touch-none select-none overflow-hidden rounded-md border border-white/10 bg-slate-950',
          disabled ? 'pointer-events-none opacity-50' : dragging ? 'cursor-grabbing' : 'cursor-crosshair'
        )}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        title="Drag a dot to set its frequency (left/right) and boost or cut (up/down). Click anywhere to move the nearest dot there. Scroll on the mid dot to widen or narrow it. Double-click a dot to reset it."
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {GRID_F.map((f) => (
            <line
              key={f}
              x1={xOf(f) * W}
              x2={xOf(f) * W}
              y1={0}
              y2={H}
              stroke="white"
              strokeOpacity={f === 100 || f === 1000 || f === 10000 ? 0.1 : 0.05}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {[-12, -6, 0, 6, 12].map((db) => (
            <line
              key={db}
              x1={0}
              x2={W}
              y1={yOf(db) * H}
              y2={yOf(db) * H}
              stroke="white"
              strokeOpacity={db === 0 ? 0.18 : 0.05}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polygon
            points={`0,${H / 2} ${points.join(' ')} ${W},${H / 2}`}
            className="fill-sky-400/15"
          />
          <polyline
            points={points.join(' ')}
            fill="none"
            className="stroke-sky-300"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {[100, 1000, 10000].map((f) => (
          <span
            key={f}
            className="pointer-events-none absolute bottom-0.5 ml-1 font-mono text-[9px] text-slate-500"
            style={{ left: `${xOf(f) * 100}%` }}
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </span>
        ))}
        {BANDS.map(({ band, label, fill }) => (
          <div
            key={band}
            data-band={band}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${label} band`}
            aria-valuemin={-MAX_DB}
            aria-valuemax={MAX_DB}
            aria-valuenow={eq[band]}
            aria-valuetext={`${fText(eqFreq[band])}, ${dbText(eq[band])}`}
            className={cn(
              'absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full font-mono text-[9px] font-bold text-slate-950 ring-2 ring-slate-950 focus:outline-none focus-visible:ring-white',
              fill,
              dragging === band && 'scale-125'
            )}
            style={{ left: `${xOf(eqFreq[band]) * 100}%`, top: `${yOf(eq[band]) * 100}%` }}
            onKeyDown={(e) => onKey(band, e)}
            onDoubleClick={() => reset(band)}
          >
            <span data-band={band}>{label[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] tabular-nums">
        {BANDS.map(({ band, label, color }) => (
          <div key={band} className="rounded bg-white/[0.03] px-1 py-1">
            <div className={cn('font-sans font-semibold', color)}>{label}</div>
            <div className="text-slate-300">{fText(eqFreq[band])}</div>
            <div className="text-slate-400">{dbText(eq[band])}</div>
            {band === 'mid' && <div className="text-slate-500">Q {eqQ}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EqCurve;
