import { useMemo, useState } from 'react';
import {
  Search, ShieldCheck, CloudOff, Infinity as InfinityIcon, Lock, X,
  Video, FileImage, FileText, Type, Music, FolderOpen, Hourglass, LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import ToolListItem from '@/components/common/ToolListItem';
import ToolsDescription from '@/components/common/ToolsDescription';
import {
  getAvailableTools,
  getComingSoonTools,
  type ToolConfig,
} from '@/config/toolsData';
import { SEO } from '@/components/SEO';
import { EXTERNAL_URLS, siteUrl } from '@/config/externalUrls';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER: ToolConfig['category'][] = ['video', 'image', 'document', 'text'];

const CATEGORY_LABELS: Record<ToolConfig['category'], string> = {
  video: 'Video & GIF',
  image: 'Image',
  document: 'Documents',
  text: 'Text',
  audio: 'Audio',
  other: 'Other',
};

const CATEGORY_ICONS: Record<ToolConfig['category'], LucideIcon> = {
  video: Video,
  image: FileImage,
  document: FileText,
  text: Type,
  audio: Music,
  other: FolderOpen,
};

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: '100% client-side' },
  { icon: CloudOff, label: 'No uploads' },
  { icon: InfinityIcon, label: 'Free forever' },
  { icon: Lock, label: 'Private by design' },
] as const;

const matchesQuery = (tool: ToolConfig, query: string): boolean => {
  if (!query) return true;
  const haystack = [tool.title, tool.description, tool.tooltip ?? '', tool.category].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
};

const Tools = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ToolConfig['category']>('all');

  const available = getAvailableTools();
  const comingSoon = getComingSoonTools();

  const categoriesWithTools = useMemo(
    () => CATEGORY_ORDER.filter((cat) => available.some((tool) => tool.category === cat)),
    [available]
  );

  const isFiltering = query.trim() !== '' || category !== 'all';

  const filtered = useMemo(
    () =>
      available.filter((tool) => matchesQuery(tool, query) && (category === 'all' || tool.category === category)),
    [available, query, category]
  );

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'sLixTOOLS — All Tools',
    itemListElement: available.map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: tool.title,
      description: tool.description,
      url: siteUrl(tool.path ?? '/'),
    })),
  };

  return (
    <div className="text-white min-h-0 pb-4">
      <SEO
        title="All Tools"
        description="Browse every free sLixTOOLS tool: video to GIF, GIF and image compression, image resizing and conversion, PDF and XML editing, and more. Runs entirely in your browser."
        structuredData={structuredData}
      />

      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center pt-2 pb-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-400 mb-3">
          <InfinityIcon className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          100% free · runs entirely in your browser
        </div>
        <h1 className="!mt-0 mb-0 text-3xl md:text-5xl font-bold tracking-tight leading-[1.08] bg-gradient-to-r from-sky-200 via-indigo-200 to-violet-200 bg-clip-text text-transparent">
          Every tool you need, in one place
        </h1>
        <p className="!mt-2 mb-0 text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Convert, compress, resize and edit your files — no uploads, no sign-up, no limits.
          Your files never leave your device.
        </p>
      </div>

      {/* Search + category filter */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Decorative logo gif floating beside the search bar */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute -right-20 top-1/2 -translate-y-1/2 rotate-6 pointer-events-none select-none"
          >
            <img
              src={EXTERNAL_URLS.DEMO_IMAGES.CRASH_DANCE}
              alt=""
              className="w-14 floating drop-shadow-[0_0_10px_rgba(56,189,248,0.25)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {(['all', ...categoriesWithTools] as const).map((cat) => {
            const active = category === cat;
            const count = cat === 'all' ? available.length : available.filter((t) => t.category === cat).length;
            const CatIcon = cat === 'all' ? LayoutGrid : CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-sm border transition-colors',
                  active
                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-medium'
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:border-sky-400/40 hover:text-white'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {cat === 'all' ? 'All tools' : CATEGORY_LABELS[cat]}
                </span>
                <span className={cn('ml-1.5 text-xs', active ? 'text-slate-700' : 'text-slate-500')}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool catalog */}
      <div className="max-w-6xl mx-auto">
        <p className="sr-only" role="status" aria-live="polite">
          {isFiltering ? `${filtered.length} tool${filtered.length === 1 ? '' : 's'} found` : ''}
        </p>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 mb-2">No tools match your search.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2 text-sm transition-colors"
            >
              Reset filters
            </button>
          </div>
        ) : isFiltering ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((tool) => (
              <ToolListItem key={tool.path || tool.title} tool={tool} variant="card" showTooltip />
            ))}
          </div>
        ) : (
          categoriesWithTools.map((cat) => {
            const CatIcon = CATEGORY_ICONS[cat];
            return (
            <section key={cat} className="mb-12" aria-label={CATEGORY_LABELS[cat]}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CatIcon className="h-[18px] w-[18px] text-sky-400" aria-hidden="true" />
                  {CATEGORY_LABELS[cat]}
                </h2>
                <span className="text-xs text-slate-500">
                  {available.filter((t) => t.category === cat).length} tools
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {available
                  .filter((tool) => tool.category === cat)
                  .map((tool) => (
                    <ToolListItem key={tool.path || tool.title} tool={tool} variant="card" showTooltip />
                  ))}
              </div>
            </section>
            );
          })
        )}

        {/* Coming soon */}
        {!isFiltering && comingSoon.length > 0 && (
          <section className="mb-10" aria-label="Coming soon">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                <Hourglass className="h-[18px] w-[18px] text-slate-500" aria-hidden="true" />
                Coming soon
              </h2>
              <span className="text-xs text-slate-600">{comingSoon.length} tools</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {comingSoon.map((tool) => (
                <ToolListItem key={tool.title} tool={tool} variant="card" showTooltip />
              ))}
            </div>
          </section>
        )}

        {/* SEO content */}
        <div className="max-w-2xl mx-auto text-center mt-6">
          <ToolsDescription textClassName="text-slate-400 text-sm mb-0 leading-relaxed" />
        </div>

        {/* Trust strip */}
        <div className="mt-12 py-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Icon className="h-4 w-4 text-sky-400/70" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tools;
