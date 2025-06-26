import React, { ReactNode } from 'react';
import { motion, MotionProps, Transition } from 'framer-motion';

interface AnimatedElementProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  type?: 'fadeIn' | 'slideUp' | 'slideIn' | 'scale' | 'bounce';
}

type AnimationPreset = {
  initial: any;
  animate: any;
  transition: Transition;
};

const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  delay = 0,
  className = '',
  type = 'fadeIn',
  ...props
}) => {
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
      transition: { duration: 0.5, delay }
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

  const selectedAnimation = animations[type];

  return (
    <motion.div
      className={className}
      initial={selectedAnimation.initial}
      animate={selectedAnimation.animate}
      transition={selectedAnimation.transition}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedElement;
