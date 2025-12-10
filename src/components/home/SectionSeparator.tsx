import React, { useEffect, useState } from 'react';
import { homeAnimations } from '@/styles/constants';

interface SectionSeparatorProps {
    isVisible: boolean;
    /** Optional container style overrides */
    className?: string;
    /** Optional content to render below the separator */
    children?: React.ReactNode;
    /** Force mounted state for initial render logic */
    forceMounted?: boolean;
}

const SectionSeparator: React.FC<SectionSeparatorProps> = ({
    isVisible,
    className = "w-full flex flex-col items-center mt-0",
    children,
    forceMounted = false
}) => {
    const [mounted, setMounted] = useState(forceMounted);

    useEffect(() => {
        setMounted(true);
    }, []);

    const transitionStyle = {
        transitionProperty: 'clip-path',
        transitionDuration: isVisible
            ? homeAnimations.SCROLL_TRANSITION_DURATION
            : '0.4s',
        transitionTimingFunction: homeAnimations.SCROLL_TRANSITION_EASING,
        transitionDelay: isVisible
            ? homeAnimations.SEPARATOR_DELAY_START
            : '0s'
    };

    const contentTransitionStyle = {
        transitionProperty: 'opacity',
        transitionDuration: isVisible
            ? homeAnimations.SCROLL_TRANSITION_DURATION
            : '0.4s',
        transitionTimingFunction: homeAnimations.SCROLL_TRANSITION_EASING,
        transitionDelay: isVisible
            ? homeAnimations.COPYRIGHT_DELAY_START
            : '0s'
    };

    return (
        <div className={className}>
            <div
                className="border-b border-dashed border-green-400 h-px"
                style={{
                    width: '100%',
                    maxWidth: '42rem',
                    clipPath: (isVisible && mounted)
                        ? 'inset(0 0 0 0)'
                        : 'inset(0 50% 0 50%)',
                    ...transitionStyle
                }}
            />

            <div
                className="text-xs mt-2 leading-none text-center"
                style={{
                    opacity: (isVisible && mounted) ? 1 : 0,
                    ...contentTransitionStyle
                }}
            >
                {children || (
                    <p>© {new Date().getFullYear()} sLixTOOLS. All rights reserved.</p>
                )}
            </div>
        </div>
    );
};

export default SectionSeparator;
