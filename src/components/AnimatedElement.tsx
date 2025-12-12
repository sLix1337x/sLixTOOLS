import { memo } from 'react';
import type { ReactNode } from 'react';
import { motion, type MotionProps, type Transition, type TargetAndTransition } from 'framer-motion';

type AnimationType = 'fadeIn' | 'slideUp' | 'slideIn' | 'scale' | 'bounce';

interface AnimatedElementProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  type?: AnimationType;
  isVisible?: boolean;
}

interface AnimationPreset {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
}

const EXIT_TRANSITION: Transition = { duration: 0.35, ease: 'easeIn' };
const EXIT_STATE: TargetAndTransition = { opacity: 0 };

const ANIMATIONS: Record<AnimationType, (delay: number) => AnimationPreset> = {
  fadeIn: (delay) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, delay },
  }),
  slideUp: (delay) => ({
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay },
  }),
  slideIn: (delay) => ({
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, delay, ease: 'easeOut' },
  }),
  scale: (delay) => ({
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, delay },
  }),
  bounce: (delay) => ({
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 15, delay },
  }),
};

const AnimatedElement = memo<AnimatedElementProps>(({
  children,
  delay = 0,
  className = '',
  type = 'fadeIn',
  isVisible = true,
  ...props
}) => {
  const animation = ANIMATIONS[type](delay);

  return (
    <motion.div
      className={className}
      initial={animation.initial}
      animate={isVisible ? animation.animate : EXIT_STATE}
      transition={isVisible ? animation.transition : EXIT_TRANSITION}
      {...props}
    >
      {children}
    </motion.div>
  );
});

AnimatedElement.displayName = 'AnimatedElement';

export default AnimatedElement;
