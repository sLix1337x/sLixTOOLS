import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAvailableTools } from '@/config/toolsData';
import { cn } from '@/lib/utils';

/**
 * Horizontal tool carousel rendered on tool pages so users can jump
 * between tools without going back to the Tools overview.
 */
const ToolSwitcher = () => {
  const { pathname } = useLocation();
  const trackRef = useRef<HTMLDivElement>(null);

  const tools = getAvailableTools();

  // Center the active chip on mount / route change
  useEffect(() => {
    const track = trackRef.current;
    const active = track?.querySelector<HTMLElement>('[data-active="true"]');
    if (track && active) {
      const target = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [pathname]);

  const scrollByAmount = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex items-center gap-1.5" aria-label="Switch between tools">
      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        aria-label="Scroll tools left"
        className="hidden md:flex shrink-0 h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:border-white/30 transition-colors shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={trackRef}
        className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-none scroll-smooth snap-x py-1 px-1"
        role="tablist"
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = tool.path === pathname;
          return (
            <Link
              key={tool.path}
              to={tool.path ?? '#'}
              role="tab"
              aria-selected={active}
              data-active={active}
              className={cn(
                'snap-start flex items-center gap-2 h-9 px-3 rounded-lg border text-[13px] leading-none whitespace-nowrap transition-colors',
                active
                  ? 'bg-sky-400/10 border-sky-400/50 text-white'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/25'
              )}
            >
              {tool.iconImage ? (
                <img
                  src={tool.iconImage}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-4 w-4 shrink-0 object-contain"
                />
              ) : (
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="font-medium">{tool.title}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        aria-label="Scroll tools right"
        className="hidden md:flex shrink-0 h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:border-white/30 transition-colors shadow-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ToolSwitcher;
