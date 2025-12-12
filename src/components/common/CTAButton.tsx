import { memo } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CTAButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  bounce?: boolean;
  blinkText?: boolean;
}

/** Base button styles */
const BASE_STYLES = 'font-bold inline-flex items-center rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';

/** Variant-specific styles */
const VARIANT_STYLES = {
  primary: 'bg-primary-action text-white shadow-[0_0_15px_rgba(42,213,135,0.5)] hover:shadow-[0_0_25px_rgba(42,213,135,0.7)] transform hover:-translate-y-1 focus:ring-white',
  secondary: 'bg-gray-700 text-white hover:bg-gray-600 shadow-md hover:shadow-lg focus:ring-gray-500',
} as const;

/** Size-specific styles */
const SIZE_STYLES = {
  sm: 'px-4 py-2 text-sm gap-2',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-3',
} as const;

/** Icon sizes per button size */
const ICON_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
} as const;

/** Bounce animation config */
const BOUNCE_ANIMATION = {
  y: [0, -4, 0],
  transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const },
};

export const CTAButton = memo<CTAButtonProps>(({
  to,
  children,
  variant = 'primary',
  size = 'lg',
  icon: Icon = ArrowRight,
  iconPosition = 'right',
  className = '',
  bounce = false,
  blinkText = false,
}) => {
  const buttonContent = (
    <Link 
      to={to} 
      className={cn(BASE_STYLES, VARIANT_STYLES[variant], SIZE_STYLES[size], className)}
    >
      {iconPosition === 'left' && Icon && <Icon className={ICON_SIZES[size]} />}
      <span className={cn(blinkText && 'animate-blink')}>{children}</span>
      {iconPosition === 'right' && Icon && <Icon className={ICON_SIZES[size]} />}
    </Link>
  );

  if (bounce) {
    return (
      <motion.div animate={BOUNCE_ANIMATION} className="inline-block">
        {buttonContent}
      </motion.div>
    );
  }

  return buttonContent;
});

CTAButton.displayName = 'CTAButton';

export default CTAButton;
