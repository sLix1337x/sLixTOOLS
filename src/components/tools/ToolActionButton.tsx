import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolActionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    icon?: LucideIcon;
    isLoading?: boolean;
    loadingText?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    variant?: 'primary' | 'secondary';
    className?: string;
}

/**
 * Standardized action button for tool pages
 * Replaces duplicate button implementations across the codebase
 * 
 * @example
 * ```tsx
 * <ToolActionButton
 *   icon={Download}
 *   onClick={handleDownload}
 *   isLoading={isCompressing}
 *   loadingText="Downloading..."
 * >
 *   Download
 * </ToolActionButton>
 * ```
 */
export const ToolActionButton: React.FC<ToolActionButtonProps> = ({
    onClick,
    children,
    icon: Icon,
    isLoading = false,
    loadingText = 'Processing...',
    disabled = false,
    fullWidth = false,
    variant = 'primary',
    className
}) => {
    const LoadingIcon = Loader2;

    const baseClasses = "font-bold py-2.5 px-6 rounded-lg flex items-center justify-center transition-all duration-200";
    const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed";
    const widthClasses = fullWidth ? "w-full md:w-auto" : "";
    const minWidthStyles = { minWidth: '200px' };

    const variantClasses = variant === 'primary'
        ? "bg-primary-action text-black rainbow-hover focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        : "bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500";

    const combinedClasses = cn(
        baseClasses,
        variantClasses,
        disabledClasses,
        widthClasses,
        className
    );

    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={combinedClasses}
            style={minWidthStyles}
            aria-busy={isLoading}
        >
            {isLoading ? (
                <>
                    <LoadingIcon className="animate-spin mr-2 h-5 w-5" aria-hidden="true" />
                    <span className="relative z-10">{loadingText}</span>
                </>
            ) : (
                <>
                    {Icon && <Icon className="mr-2 h-5 w-5" aria-hidden="true" />}
                    <span className="relative z-10">{children}</span>
                </>
            )}
        </button>
    );
};

export default ToolActionButton;
