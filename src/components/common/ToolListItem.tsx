import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedElement from '@/components/AnimatedElement';
import SpotlightCard from '@/components/common/SpotlightCard';
import type { ToolConfig } from '@/config/toolsData';

export interface ToolListItemProps {
    tool: ToolConfig;
    variant?: 'simple' | 'card';
    showTooltip?: boolean;
}

/**
 * Unified Tool List/Card component
 * Supports both simple list view (Home page) and detailed card view (Tools page)
 * Eliminates duplication between ToolItem and ToolCard implementations
 */
const ToolListItem: React.FC<ToolListItemProps> = React.memo(({
    tool,
    variant = 'simple',
    showTooltip = false
}) => {
    const { title, tooltip, icon: Icon, path, comingSoon } = tool;

    // Simple list variant (used on Home page)
    if (variant === 'simple') {
        const content = (
            <div className={`py-0.5 text-base group ${comingSoon ? 'opacity-60' : 'hover:text-[#42C574]'}`}>
                <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 ${comingSoon ? 'text-gray-400' : 'text-gray-400 group-hover:text-[#42C574]'}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className={`${comingSoon ? 'text-gray-400' : 'text-gray-300 group-hover:text-[#42C574]'} transition-colors duration-200`}>
                        {title}
                    </span>
                    {comingSoon && (
                        <span className="text-xs text-gray-500 ml-auto">
                            Coming Soon
                        </span>
                    )}
                </div>
            </div>
        );

        if (comingSoon || !path) {
            return content;
        }

        return (
            <Link to={path} className="block">
                {content}
            </Link>
        );
    }

    // Card variant (used on Tools page)
    const cardContent = (
        <SpotlightCard
            className={`relative w-full min-h-[140px] md:aspect-square p-3 md:p-4 transition-all duration-300 ease-in-out flex flex-col items-start justify-start space-y-1 text-left group focus-within:ring-2 focus-within:ring-green-400/40 ${comingSoon
                    ? 'bg-white/5 border-white/20 cursor-not-allowed opacity-60'
                    : 'bg-white/5 border-white/40 hover:border-white/70 hover:-translate-y-[2px] hover:shadow-lg focus-within:border-white/80 focus-within:-translate-y-[2px]'
                }`}
        >
            {comingSoon && (
                <span className="absolute right-2 top-2 rounded bg-blue-600/70 px-2 py-1 text-[11px] font-semibold text-neutral-100 shadow">
                    Coming Soon
                </span>
            )}

            {/* Icon */}
            <div>
                <div
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 transition-all duration-300 ${comingSoon
                            ? 'bg-gray-800/50 text-gray-500'
                            : 'bg-green-400/10 text-green-400 group-hover:bg-green-400/20 group-hover:scale-105'
                        }`}
                    aria-hidden="true"
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>

            {/* Title */}
            <h3
                className={`mt-2 text-base font-semibold tracking-tight leading-tight transition-colors duration-300 ${comingSoon ? 'text-gray-400' : 'text-white group-hover:text-green-400'
                    }`}
            >
                {title}
            </h3>

            {/* Tooltip/Description */}
            {showTooltip && tooltip && (
                <p
                    className={`mt-1 text-xs leading-tight pr-1 break-words transition-colors duration-300 ${comingSoon ? 'text-gray-500' : 'text-gray-300 group-hover:text-gray-200'
                        }`}
                >
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
