import React, { useEffect } from 'react';

// Particle Background Component
const ParticleBackground = () => {
  useEffect(() => {
    // Add CSS animations
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
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    // Using z-index: 0 to ensure particles are visible above sections with negative z-index
    container.className = 'fixed inset-0 z-0 opacity-30 pointer-events-none';
    container.innerHTML = '<div class="absolute inset-0 bg-particles"></div>';
    document.body.appendChild(container);

    const particleContainer = container.querySelector('.bg-particles');
    if (!particleContainer) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'absolute rounded-full bg-purple-200 dark:bg-purple-800';
      
      // Random size between 2x2 and 6x6
      const size = Math.random() * 4 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random position
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      // Animation
      const duration = Math.random() * 10 + 10;
      particle.style.animation = `float ${duration}s linear infinite`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      
      particleContainer.appendChild(particle);
      
      // Clean up
      setTimeout(() => {
        particle.remove();
      }, duration * 1000);
    };

    // Create initial particles
    for (let i = 0; i < 20; i++) {
      setTimeout(createParticle, i * 500);
    }

    // Add new particles periodically
    const interval = setInterval(createParticle, 2000);

    return () => {
      clearInterval(interval);
      if (style.parentNode) {
        document.head.removeChild(style);
      }
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    };
  }, []);

  return null;
};

export default ParticleBackground;
