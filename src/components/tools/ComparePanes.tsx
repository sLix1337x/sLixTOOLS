interface PaneProps {
  label: string;
  meta?: string | undefined;
  src?: string | null | undefined;
  emptyText?: string | undefined;
}

const Pane = ({ label, meta, src, emptyText }: PaneProps) => (
  <figure className="m-0 flex min-h-0 min-w-0 flex-col">
    <figcaption className="flex items-center justify-between gap-3 px-4 pt-3 text-xs">
      <span className="font-medium text-slate-300">{label}</span>
      {meta && <span className="truncate font-mono text-[11px] text-slate-400">{meta}</span>}
    </figcaption>
    <div className="relative min-h-[40dvh] flex-1 lg:min-h-0">
      {src ? (
        <img src={src} alt={label} className="absolute inset-0 h-full w-full object-contain p-4" />
      ) : (
        <p className="absolute inset-0 mt-0 flex items-center justify-center p-4 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  </figure>
);

interface ComparePanesProps {
  originalSrc: string | null;
  originalMeta: string;
  resultSrc: string | null;
  resultMeta?: string | undefined;
  resultLabel: string;
  emptyText: string;
}

/** Original and result next to each other, both fitted to the work area. */
const ComparePanes = ({ originalSrc, originalMeta, resultSrc, resultMeta, resultLabel, emptyText }: ComparePanesProps) => (
  <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
    <Pane label="Original" meta={originalMeta} src={originalSrc} />
    <Pane label={resultLabel} meta={resultMeta} src={resultSrc} emptyText={emptyText} />
  </div>
);

export default ComparePanes;
