import { memo, useRef, useState, useCallback } from 'react';
import type { HTMLAttributes, ReactNode, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

/** Base card styles */
const BASE_STYLES = 'relative overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl';

const SpotlightCard = memo<SpotlightCardProps>(({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.15)',
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseEnter = useCallback(() => setOpacity(1), []);
  const handleMouseLeave = useCallback(() => setOpacity(0), []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(BASE_STYLES, className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
});

SpotlightCard.displayName = 'SpotlightCard';

export default SpotlightCard;
