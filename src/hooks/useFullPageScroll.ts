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

        const goTo = (newSection: number): boolean => {
            if (newSection === currentSectionRef.current) return false;
            if (newSection < 0 || newSection >= totalSections) return false;

            isScrollingRef.current = true;
            currentSectionRef.current = newSection;
            setCurrentSection(newSection);

            window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));
            window.dispatchEvent(new CustomEvent('section-change', { detail: { section: newSection } }));

            setTimeout(() => {
                isScrollingRef.current = false;
            }, scrollTimeout);
            return true;
        };

        const handleWheel = (e: WheelEvent) => {
            if (isScrollingRef.current) {
                e.preventDefault();
                return;
            }

            const delta = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
            if (delta && goTo(currentSectionRef.current + delta)) e.preventDefault();
        };

        // Keyboard: PageUp/PageDown, arrows, Space/Shift+Space, Home/End move between sections
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (e.key === ' ' && target?.closest('button, a, summary')) return;

            const current = currentSectionRef.current;
            const next: Record<string, number> = {
                ArrowDown: current + 1,
                PageDown: current + 1,
                ArrowUp: current - 1,
                PageUp: current - 1,
                ' ': e.shiftKey ? current - 1 : current + 1,
                Home: 0,
                End: totalSections - 1,
            };
            if (!(e.key in next)) return;

            e.preventDefault();
            if (!isScrollingRef.current) goTo(next[e.key]);
        };

        // Touch devices above the mobile breakpoint (tablets) have no wheel: swipe instead
        let touchStartY: number | null = null;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0]?.clientY ?? null;
        };
        const handleTouchEnd = (e: TouchEvent) => {
            const endY = e.changedTouches[0]?.clientY;
            const startY = touchStartY;
            touchStartY = null;
            if (startY === null || endY === undefined || isScrollingRef.current) return;
            const dy = startY - endY;
            if (Math.abs(dy) > 50) goTo(currentSectionRef.current + Math.sign(dy));
        };

        // Tabbing into an off-screen section shows that section, and undoes the
        // browser's attempt to scroll the overflow:hidden container to the focus.
        const handleFocusIn = (e: FocusEvent) => {
            const section = (e.target as HTMLElement | null)?.closest('section');
            const wrapper = section?.parentElement;
            if (!section || !wrapper || !container.contains(wrapper)) return;
            container.scrollTop = 0;
            goTo(Array.prototype.indexOf.call(wrapper.children, section));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('focusin', handleFocusIn);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, scrollTimeout, totalSections]);

    return {
        currentSection,
        containerRef,
        isScrolling: isScrollingRef.current
    };
};
