import { cn } from '@/lib/utils';

interface DividerProps {
  /** Optional centered text label (e.g. "Result"). Falls back to a small diamond accent. */
  label?: string;
  className?: string;
}

/**
 * Decorative gradient hairline with a centered accent (diamond) or label.
 * Used to separate sections on tool pages.
 */
const Divider = ({ label, className }: DividerProps) => (
  <div className={cn('flex items-center gap-4', className)}>
    <span
      aria-hidden="true"
      className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/10"
    />
    {label ? (
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
    ) : (
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rotate-45 bg-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.45)]"
      />
    )}
    <span
      aria-hidden="true"
      className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/20 to-transparent"
    />
  </div>
);

export default Divider;
