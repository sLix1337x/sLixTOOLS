import { memo } from 'react';
import { Link } from 'react-router-dom';
import AnimatedElement from '@/components/AnimatedElement';
import SpotlightCard from '@/components/common/SpotlightCard';
import { cn } from '@/lib/utils';
import type { ToolConfig } from '@/config/toolsData';

export interface ToolListItemProps {
  tool: ToolConfig;
  variant?: 'simple' | 'card';
  showTooltip?: boolean;
}

/** Style classes for simple variant */
const SIMPLE_STYLES = {
  available: 'hover:text-[#38bdf8]',
  disabled: 'opacity-60',
  iconAvailable: 'text-gray-400 group-hover:text-[#38bdf8]',
  iconDisabled: 'text-gray-400',
  textAvailable: 'text-gray-300 group-hover:text-[#38bdf8]',
  textDisabled: 'text-gray-400',
} as const;

/** Style classes for card variant */
const CARD_STYLES = {
  base: 'relative w-full p-4 transition-all duration-300 ease-in-out flex flex-col items-start justify-start text-left group focus-within:ring-2 focus-within:ring-sky-400/40',
  available: 'bg-white/[0.03] border border-white/10 hover:border-sky-400/40 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(56,189,248,0.3)] focus-within:border-sky-400/50',
  disabled: 'bg-white/[0.02] border border-white/10 cursor-not-allowed opacity-60',
  iconContainerAvailable: 'bg-sky-400/10 text-sky-400 group-hover:bg-sky-400/15 group-hover:scale-105',
  iconContainerDisabled: 'bg-white/5 text-slate-500',
  titleAvailable: 'text-white',
  titleDisabled: 'text-slate-400',
  descAvailable: 'text-slate-400 group-hover:text-slate-300 line-clamp-2',
  descDisabled: 'text-slate-500 line-clamp-2',
} as const;

/**
 * Unified Tool List/Card component
 * Supports both simple list view (Home page) and detailed card view (Tools page)
 */
const ToolListItem = memo<ToolListItemProps>(({
  tool,
  variant = 'simple',
  showTooltip = false,
}) => {
  const { title, tooltip, icon: Icon, path, comingSoon } = tool;

  // Simple list variant (used on Home page)
  if (variant === 'simple') {
    const content = (
      <div className={cn("py-0.5 text-base group", comingSoon ? SIMPLE_STYLES.disabled : SIMPLE_STYLES.available)}>
        <div className="flex items-center space-x-2">
          <div className={cn("flex-shrink-0", comingSoon ? SIMPLE_STYLES.iconDisabled : SIMPLE_STYLES.iconAvailable)}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className={cn("transition-colors duration-200", comingSoon ? SIMPLE_STYLES.textDisabled : SIMPLE_STYLES.textAvailable)}>
            {title}
          </span>
          {comingSoon && (
            <span className="text-xs text-gray-500 ml-auto">Coming Soon</span>
          )}
        </div>
      </div>
    );

    if (comingSoon || !path) return content;

    return (
      <Link to={path} className="block">
        {content}
      </Link>
    );
  }

  // Card variant (used on Tools page)
  const cardContent = (
    <SpotlightCard className={cn(CARD_STYLES.base, comingSoon ? CARD_STYLES.disabled : CARD_STYLES.available)}>
      {comingSoon && (
        <span className="absolute right-2 top-2 rounded bg-blue-600/70 px-2 py-1 text-[11px] font-semibold text-neutral-100 shadow">
          Coming Soon
        </span>
      )}

      <div>
        {tool.iconImage ? (
          <img
            src={tool.iconImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-11 w-11 md:h-12 md:w-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-lg border border-white/10 transition-all duration-300",
              comingSoon ? CARD_STYLES.iconContainerDisabled : CARD_STYLES.iconContainerAvailable
            )}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <h3 className={cn(
        "mt-2 text-base font-semibold tracking-tight leading-tight transition-colors duration-300",
        comingSoon ? CARD_STYLES.titleDisabled : CARD_STYLES.titleAvailable
      )}>
        {title}
      </h3>

      {showTooltip && tooltip && (
        <p className={cn(
          "mt-1 text-xs leading-tight pr-1 break-words transition-colors duration-300",
          comingSoon ? CARD_STYLES.descDisabled : CARD_STYLES.descAvailable
        )}>
          {tooltip}
        </p>
      )}
    </SpotlightCard>
  );

  if (comingSoon) {
    return (
      <AnimatedElement type="fadeIn" className="h-full">
        <div className="block h-full" data-tool-name={title} aria-disabled="true">
          {cardContent}
        </div>
      </AnimatedElement>
    );
  }

  return (
    <AnimatedElement type="fadeIn" className="h-full">
      <Link
        to={path ?? '/tools'}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl"
        data-tool-name={title}
      >
        {cardContent}
      </Link>
    </AnimatedElement>
  );
});

ToolListItem.displayName = 'ToolListItem';

export default ToolListItem;
