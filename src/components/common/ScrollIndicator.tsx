import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScrollIndicatorProps {
  isVisible: boolean;
  className?: string;
}

export const ScrollIndicator = ({ isVisible, className }: ScrollIndicatorProps) => (
  <div className={cn(
    "absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-500",
    isVisible ? 'opacity-100' : 'opacity-0',
    className
  )}>
    <ChevronDown className="text-3xl text-gray-400 animate-bounce" />
  </div>
);

export default ScrollIndicator;

