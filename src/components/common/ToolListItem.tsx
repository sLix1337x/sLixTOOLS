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
  available: 'hover:text-[#42C574]',
  disabled: 'opacity-60',
  iconAvailable: 'text-gray-400 group-hover:text-[#42C574]',
  iconDisabled: 'text-gray-400',
  textAvailable: 'text-gray-300 group-hover:text-[#42C574]',
  textDisabled: 'text-gray-400',
} as const;

/** Style classes for card variant */
const CARD_STYLES = {
  base: 'relative w-full min-h-[100px] md:min-h-[120px] md:aspect-square p-3 transition-all duration-300 ease-in-out flex flex-col items-start justify-start space-y-1 text-left group focus-within:ring-2 focus-within:ring-green-400/40',
  available: 'bg-white/5 border-white/40 hover:border-white/70 hover:-translate-y-[2px] hover:shadow-lg focus-within:border-white/80 focus-within:-translate-y-[2px]',
  disabled: 'bg-white/5 border-white/20 cursor-not-allowed opacity-60',
  iconContainerAvailable: 'bg-green-400/10 text-green-400 group-hover:bg-green-400/20 group-hover:scale-105',
  iconContainerDisabled: 'bg-gray-800/50 text-gray-500',
  titleAvailable: 'text-white group-hover:text-green-400',
  titleDisabled: 'text-gray-400',
  descAvailable: 'text-gray-300 group-hover:text-gray-200',
  descDisabled: 'text-gray-500',
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
            <Icon className="w-5 h-5" />
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
        <div
          className={cn(
            "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-white/10 transition-all duration-300",
            comingSoon ? CARD_STYLES.iconContainerDisabled : CARD_STYLES.iconContainerAvailable
          )}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </div>
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
        to={path || '#'}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
        data-tool-name={title}
      >
        {cardContent}
      </Link>
    </AnimatedElement>
  );
});

ToolListItem.displayName = 'ToolListItem';

export default ToolListItem;
