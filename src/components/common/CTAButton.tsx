import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CTAButtonProps {
    to: string;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    className?: string;
}

/**
 * Reusable CTA (Call-to-Action) Button component
 * Provides consistent styling for primary action buttons across the site
 */
export const CTAButton: React.FC<CTAButtonProps> = ({
    to,
    children,
    variant = 'primary',
    size = 'lg',
    icon: Icon = ArrowRight,
    iconPosition = 'right',
    className = '',
}) => {
    const baseStyles = 'font-bold inline-flex items-center rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantStyles = {
        primary: 'bg-primary-action text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:ring-white',
        secondary: 'bg-gray-700 text-white hover:bg-gray-600 shadow-md hover:shadow-lg focus:ring-gray-500',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm gap-2',
        md: 'px-6 py-3 text-base gap-2',
        lg: 'px-8 py-4 text-lg gap-3',
    };

    const iconSizeMap = {
        sm: 'w-4 h-4',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

    return (
        <Link to={to} className={combinedClassName}>
            {iconPosition === 'left' && Icon && <Icon className={iconSizeMap[size]} />}
            <span>{children}</span>
            {iconPosition === 'right' && Icon && <Icon className={iconSizeMap[size]} />}
        </Link>
    );
};

export default CTAButton;
