import React, { useEffect, useCallback, useRef, useState } from 'react';

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  animationSpeed?: number;
  enableReducedMotion?: boolean;
}

// Optimized Particle Background Component
const ParticleBackground: React.FC<ParticleBackgroundProps> = React.memo(({ 
  className = '',
  particleCount = 25, // Increased for better visibility
  animationSpeed = 1,
  enableReducedMotion = false
}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    
    // Add CSS animations with better performance
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
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
        z-index: -10 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
      .particle {
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform: translateZ(0);
        position: absolute !important;
        background-color: #a855f7 !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        z-index: -9 !important;
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'particle-bg-container';
    container.style.opacity = '0.8';
    container.innerHTML = '<div class="absolute inset-0" style="z-index: -9;"></div>';
    document.body.appendChild(container);
    containerRef.current = container;

    const particleContainer = container.querySelector('div');
    if (!particleContainer) return;

    const createParticle = () => {
      // Don't create particles if tab is not visible
      if (!isVisible) return;
      
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random size between 3x3 and 8x8
      const size = Math.random() * 5 + 3;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random position
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
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
      }, duration * 1000);
      
      // Store cleanup reference for early cleanup if needed
      particle.dataset.cleanup = cleanup.toString();
    };

    // Create initial particles with staggered timing
    const initialParticles = Math.min(particleCount, 25); // Cap at 25 for performance
    for (let i = 0; i < initialParticles; i++) {
      setTimeout(createParticle, i * 300); // Reduced interval
    }

    // Add new particles periodically, but only when visible
    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (isVisible) {
          createParticle();
        }
      }, 3000); // Increased interval for better performance
    };
    
    startInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (style.parentNode) {
        document.head.removeChild(style);
      }
      if (container.parentNode) {
        // Clean up any remaining particles
        const particles = container.querySelectorAll('.particle');
        particles.forEach(particle => {
          const cleanup = particle.dataset.cleanup;
          if (cleanup) {
            clearTimeout(parseInt(cleanup));
          }
        });
        document.body.removeChild(container);
      }
    };
  }, [particleCount, animationSpeed, isVisible, prefersReducedMotion]);

  return null;
});

ParticleBackground.displayName = 'ParticleBackground';

export default ParticleBackground;
