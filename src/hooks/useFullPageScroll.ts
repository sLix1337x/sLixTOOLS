import { useState, useEffect, useRef, RefObject } from 'react';
import { homeAnimations } from '@/styles/constants';

interface UseFullPageScrollOptions {
    totalSections: number;
    scrollTimeout?: number;
    enabled?: boolean;
}

interface UseFullPageScrollResult {
    currentSection: number;
    containerRef: RefObject<HTMLDivElement>;
    isScrolling: boolean;
}

export const useFullPageScroll = ({
    totalSections,
    scrollTimeout = homeAnimations.SCROLL_TIMEOUT_MS,
    enabled = true
}: UseFullPageScrollOptions): UseFullPageScrollResult => {
    const [currentSection, setCurrentSection] = useState(0);
    const isScrollingRef = useRef(false);
    const currentSectionRef = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        currentSectionRef.current = currentSection;
    }, [currentSection]);

    useEffect(() => {
        if (!enabled) return;
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (isScrollingRef.current) {
                e.preventDefault();
                return;
            }

            const delta = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
            if (!delta) return;

            const section = currentSectionRef.current;
            const newSection = section + delta;
            if (newSection < 0 || newSection >= totalSections) return;

            e.preventDefault();
            isScrollingRef.current = true;
            setCurrentSection(newSection);
            
            window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));
            window.dispatchEvent(new CustomEvent('section-change', { detail: { section: newSection } }));

            setTimeout(() => {
                isScrollingRef.current = false;
            }, scrollTimeout);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [enabled, scrollTimeout, totalSections]);

    return {
        currentSection,
        containerRef,
        isScrolling: isScrollingRef.current
    };
};
