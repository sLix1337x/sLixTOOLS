import { useState, useEffect, useRef, RefObject } from 'react';
import { homeAnimations } from '@/styles/constants';

interface UseFullPageScrollOptions {
    totalSections: number;
    scrollTimeout?: number;
}

interface UseFullPageScrollResult {
    currentSection: number;
    containerRef: RefObject<HTMLDivElement>;
    isScrolling: boolean;
}

export const useFullPageScroll = ({
    totalSections,
    scrollTimeout = homeAnimations.SCROLL_TIMEOUT_MS
}: UseFullPageScrollOptions): UseFullPageScrollResult => {
    const [currentSection, setCurrentSection] = useState(0);
    const isScrollingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Prevent scrolling if already transitioning
            if (isScrollingRef.current) {
                e.preventDefault();
                return;
            }

            e.preventDefault();

            if (e.deltaY > 0 && currentSection < totalSections - 1) {
                // Scroll down
                isScrollingRef.current = true;
                setCurrentSection(currentSection + 1);
                window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));

                setTimeout(() => {
                    isScrollingRef.current = false;
                }, scrollTimeout);

            } else if (e.deltaY < 0 && currentSection > 0) {
                // Scroll up
                isScrollingRef.current = true;
                setCurrentSection(currentSection - 1);
                window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));

                setTimeout(() => {
                    isScrollingRef.current = false;
                }, scrollTimeout);
            }
        };

        // Add event listener with passive: false to allow preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [currentSection, totalSections, scrollTimeout]);

    return {
        currentSection,
        containerRef,
        isScrolling: isScrollingRef.current
    };
};
