import type { ReactNode, RefObject } from 'react';
import { homeAnimations } from '@/styles/constants';
import { cn } from '@/lib/utils';

export interface FullPageSectionsWrapperProps {
  children: ReactNode;
  currentSection: number;
  isMobile?: boolean;
  className?: string;
}

export const FullPageSectionsWrapper = ({
  children,
  currentSection,
  isMobile = false,
  className,
}: FullPageSectionsWrapperProps) => {
  const transform = isMobile 
    ? 'none' 
    : `translateY(-${currentSection * 100}vh)`;
  
  const transition = isMobile 
    ? 'none' 
    : `transform ${homeAnimations.SCROLL_TRANSITION_DURATION} ${homeAnimations.SCROLL_TRANSITION_EASING}`;

  return (
    <div
      className={cn("sections-wrapper", className)}
      style={{ transform, transition }}
    >
      {children}
    </div>
  );
};

export default FullPageSectionsWrapper;

