// Home Page Animation Constants
export const homeAnimations = {
  SCROLL_TRANSITION_DURATION: '1.5s',
  SCROLL_TRANSITION_EASING: 'cubic-bezier(0.65, 0, 0.35, 1)',
  SCROLL_TIMEOUT_MS: 1600,
  SEPARATOR_DELAY_START: '0.4s',
  COPYRIGHT_DELAY_START: '0.7s',
} as const;

// Tool page controls
export const chipButton =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/25 bg-white/[0.08] text-sm font-medium text-white transition-colors enabled:hover:border-sky-400/70 enabled:hover:bg-sky-400/20 disabled:opacity-60 disabled:cursor-not-allowed';
export const iconButton =
  'inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/20 bg-white/[0.06] text-slate-200 transition-colors enabled:hover:text-white enabled:hover:border-sky-400/60 enabled:hover:bg-sky-400/15 disabled:opacity-50 disabled:cursor-not-allowed';
export const sectionLabel = 'text-xs font-semibold uppercase tracking-wide text-slate-300';
export const fieldClass =
  'h-9 w-full rounded-md border border-white/15 bg-[#171714] px-3 text-sm text-white placeholder-gray-500 outline-none focus:border-sky-400/60';
export const pressedChip = 'aria-pressed:border-sky-400/60 aria-pressed:bg-sky-400/15 aria-pressed:text-sky-300';
export const segmentGroup = 'inline-flex max-w-full flex-wrap rounded-lg bg-white/[0.06] p-0.5';
export const segmentButton =
  'h-8 rounded-md px-2.5 text-xs font-medium text-slate-300 transition-colors enabled:hover:text-white aria-pressed:bg-sky-400/20 aria-pressed:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400';
export const toolButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white aria-pressed:bg-sky-400/20 aria-pressed:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400';
export const primaryButton =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-action px-3 text-sm font-medium text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-all enabled:hover:bg-primary-action/90 enabled:hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] disabled:cursor-not-allowed disabled:opacity-60';

// Full-width tool page frame
export const toolWorkspace = 'flex flex-col lg:h-[calc(100dvh-3rem)]';
export const toolbarRow = 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-2';
export const toolDropzone = 'mx-auto flex min-h-[50dvh] w-full max-w-4xl flex-1 flex-col p-4';
export const settingsGrid = 'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]';
export const settingsColumn = 'space-y-5 border-t border-white/10 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0';
export const statusRow =
  'flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/10 px-4 py-2 font-mono text-[11px] text-slate-400';

export const errorRow =
  'flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-900/20 px-4 py-2 text-sm text-red-300';

// Explanatory cards below full-width tools
export const guideCard = 'rounded-lg bg-white/5 p-4 text-left';
export const guideHeading = 'mb-3 flex items-center gap-2 text-lg font-semibold text-blue-400';
export const guideKey = 'rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-sans text-xs text-slate-200';
