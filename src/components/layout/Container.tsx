import type { ReactNode } from 'react';

export interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}

const SIZE_CLASSES = {
  default: 'container mx-auto px-4 md:px-6',
  narrow: 'max-w-4xl mx-auto px-4 md:px-6',
  wide: 'max-w-7xl mx-auto px-4 md:px-6',
} as const;

export const Container = ({ children, className = '', size = 'default' }: ContainerProps) => (
  <div className={`${SIZE_CLASSES[size]} ${className}`.trim()}>
    {children}
  </div>
);

export default Container;
