import React, { useEffect, useCallback, useRef, useState } from 'react';

interface ParticleBackgroundProps {
  className?: string | undefined;
  particleCount?: number | undefined;
  animationSpeed?: number | undefined;
  enableReducedMotion?: boolean | undefined;
}

// Optimized Particle Background Component
const ParticleBackground: React.FC<ParticleBackgroundProps> = React.memo(({ 
  className = '',
  particleCount = 15, // Reduced for better performance
  animationSpeed = 1,
  enableReducedMotion = false
}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set()); // Track all timeouts for cleanup
  const [isVisible, setIsVisible] = useState(true);
  
  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    return enableReducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [enableReducedMotion]);
  

  
  // Visibility API to pause animations when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    // Skip animations if reduced motion is preferred
    if (prefersReducedMotion()) {
      return;
    }
    
    // Capture ref values at the start of the effect
    const timeouts = timeoutsRef.current;
    
    // Clear any existing timeouts
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts.clear();
    
    // Add CSS animations with better performance
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0% { transform: translateY(0) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
      }
      @keyframes slidebg {
        to { background-position: 20vw; }
      }
      .rainbow-hover {
        transition: all 0.3s ease;
      }
      .rainbow-hover:hover {
        background-image: linear-gradient(90deg, #00C0FF 0%, #FFCF00 49%, #FC4F4F 80%, #00C0FF 100%);
        background-size: 20vw auto;
        animation: slidebg 5s linear infinite;
        color: white !important;
        border-color: transparent !important;
      }
      .particle-bg-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
      .particle-custom {
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform: translateZ(0);
        position: absolute !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        z-index: 1 !important;
        opacity: 0.6 !important;
      }
      .particle-white {
        background-color: rgba(255, 255, 255, 0.8) !important;
      }
      .particle-purple {
        background-color: rgba(168, 85, 247, 0.8) !important;
      }
    `;
    document.head.appendChild(style);

    // Use the React ref instead of creating a new DOM element
    const container = containerRef.current;
    if (!container) return;
    
    container.style.opacity = '0.8';
    const particleContainer = container;

    const createParticle = () => {
      // Don't create particles if tab is not visible
      if (!isVisible) return;
      
      const particle = document.createElement('div');
      // Randomly choose between white and purple particles
      const isWhite = Math.random() > 0.5;
      particle.className = `particle-custom ${isWhite ? 'particle-white' : 'particle-purple'}`;
      
      // Larger, more visible particles
      const size = Math.random() * 8 + 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random horizontal position, start from bottom
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = '100vh';
      
      // Animation with speed control
      const duration = (Math.random() * 10 + 10) / animationSpeed;
      particle.style.animation = `float ${duration}s linear infinite`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      
      particleContainer.appendChild(particle);
      
      // Clean up with better memory management
      const cleanup = setTimeout(() => {
        if (particle.parentNode) {
          particle.remove();
        }
        timeouts.delete(cleanup); // Remove from tracking
      }, duration * 1000);
      
      // Track timeout for cleanup
      timeouts.add(cleanup);
      // Store cleanup reference for early cleanup if needed
      (particle as HTMLElement).dataset.cleanup = cleanup.toString();
    };

    // Create fewer initial particles for better performance
    const initialParticles = Math.min(particleCount, 15); // Reduced for performance
    for (let i = 0; i < initialParticles; i++) {
      const timeout = setTimeout(createParticle, i * 200); // Slower creation
      timeouts.add(timeout); // Track timeout for cleanup
    }

    // Add new particles periodically, but only when visible
    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (isVisible) {
          createParticle();
        }
      }, 2500); // Slower particle creation for better performance
    };
    
    startInterval();

    return () => {
      // Critical fix: Clear all tracked timeouts to prevent memory leaks
      timeouts.forEach(timeout => {
        clearTimeout(timeout);
      });
      timeouts.clear();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (style.parentNode) {
        document.head.removeChild(style);
      }
      if (container) {
        // Clean up any remaining particles
        const particles = container.querySelectorAll('.particle-custom');
        particles.forEach(particle => {
          const cleanup = (particle as HTMLElement & { dataset: { cleanup: string } }).dataset.cleanup;
          if (cleanup) {
            clearTimeout(parseInt(cleanup));
          }
          particle.remove();
        });
      }
    };
  }, [particleCount, animationSpeed, isVisible, prefersReducedMotion, enableReducedMotion]);

  return (
    <div
      ref={containerRef}
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
    />
  );
});

ParticleBackground.displayName = 'ParticleBackground';

export default ParticleBackground;
