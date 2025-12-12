import React, { ReactNode, useMemo } from 'react';
import { motion, MotionProps, Transition } from 'framer-motion';

interface AnimatedElementProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  type?: 'fadeIn' | 'slideUp' | 'slideIn' | 'scale' | 'bounce';
  isVisible?: boolean;
}

type AnimationPreset = {
  initial: any;
  animate: any;
  transition: Transition;
};

const AnimatedElement: React.FC<AnimatedElementProps> = React.memo(({
  children,
  delay = 0,
  className = '',
  type = 'fadeIn',
  isVisible = true,
  ...props
}) => {
  const selectedAnimation = useMemo(() => {
    const animations: Record<string, AnimationPreset> = {
      fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.6, delay }
      },
      slideUp: {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay }
      },
      slideIn: {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.8, delay, ease: "easeOut" }
      },
      scale: {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, delay }
      },
      bounce: {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 15,
          delay
        }
      }
    };
    return animations[type];
  }, [type, delay]);

  // Use faster transition for exit (when isVisible becomes false)
  const exitTransition: Transition = useMemo(() => ({
    duration: 0.35,
    ease: "easeIn" as const
  }), []);

  // Exit state - only fade out, don't move position (cleaner exit)
  const exitState = useMemo(() => ({
    opacity: 0
  }), []);

  return (
    <motion.div
      className={className}
      initial={selectedAnimation.initial}
      animate={isVisible ? selectedAnimation.animate : exitState}
      transition={isVisible ? selectedAnimation.transition : exitTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
});

AnimatedElement.displayName = 'AnimatedElement';

export default AnimatedElement;

