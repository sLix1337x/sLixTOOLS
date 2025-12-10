import React, { memo } from 'react';

interface ParticleBackgroundProps {
  className?: string | undefined;
  particleCount?: number | undefined;
  animationSpeed?: number | undefined;
  enableReducedMotion?: boolean | undefined;
}

// Simplified Background Component (formerly ParticleBackground)
// Now focuses on the Background Overlay and base styles
const ParticleBackground: React.FC<ParticleBackgroundProps> = memo(({
  className = ''
}) => {
  return (
    <div
      className={`particle-bg-container ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/ColorBackgroundOverlay.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.8,
        }}
      />
    </div>
  );
});

ParticleBackground.displayName = 'ParticleBackground';

export default ParticleBackground;
