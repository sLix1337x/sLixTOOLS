import React from 'react';

export interface ContainerProps {
    children: React.ReactNode;
    className?: string;
    size?: 'default' | 'narrow' | 'wide';
}

/**
 * Reusable Container component for consistent page layout
 * Provides responsive padding and max-width constraints
 */
export const Container: React.FC<ContainerProps> = ({
    children,
    className = '',
    size = 'default'
}) => {
    const sizeClasses = {
        default: 'container mx-auto px-4 md:px-6',
        narrow: 'max-w-4xl mx-auto px-4 md:px-6',
        wide: 'max-w-7xl mx-auto px-4 md:px-6',
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`.trim()}>
            {children}
        </div>
    );
};

export default Container;
