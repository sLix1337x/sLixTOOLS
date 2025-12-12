import type { ReactNode } from 'react';
import { homeAnimations } from '@/styles/constants';
import { COPYRIGHT_TEXT } from '@/components/common/FooterLinks';

interface SectionSeparatorProps {
  isVisible: boolean;
  className?: string;
  children?: ReactNode;
}

export const SectionSeparator = ({
  isVisible,
  className = 'w-full flex flex-col items-center mt-0',
  children,
}: SectionSeparatorProps) => (
  <div className={className}>
    <div
      className="border-b border-dashed h-px pointer-events-none w-full mx-auto"
      style={{
        maxWidth: '611px',
        borderColor: '#4ade80',
        opacity: 1,
        clipPath: isVisible ? 'inset(0)' : 'inset(0 50%)',
        transition: `clip-path ${isVisible ? homeAnimations.SCROLL_TRANSITION_DURATION : '0.4s'} ${homeAnimations.SCROLL_TRANSITION_EASING} ${isVisible ? homeAnimations.SEPARATOR_DELAY_START : '0s'}`,
      }}
    />
    <div
      className="text-xs mt-2 leading-none text-center"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${isVisible ? homeAnimations.SCROLL_TRANSITION_DURATION : '0.4s'} ${homeAnimations.SCROLL_TRANSITION_EASING} ${isVisible ? homeAnimations.COPYRIGHT_DELAY_START : '0s'}`,
      }}
    >
      {children ?? <p>{COPYRIGHT_TEXT}</p>}
    </div>
  </div>
);

export default SectionSeparator;
