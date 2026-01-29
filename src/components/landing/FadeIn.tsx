import { memo } from 'react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  blur?: boolean;
  scale?: boolean;
}

// Optimized direction offsets - smaller values for smoother animation
const directionOffset = {
  up: { y: 16, x: 0 },
  down: { y: -16, x: 0 },
  left: { y: 0, x: 16 },
  right: { y: 0, x: -16 },
  none: { y: 0, x: 0 },
};

export const FadeIn = memo(function FadeIn({ 
  children, 
  className = '', 
  delay = 0, 
  duration = 0.4,
  direction = 'up',
  blur = false,
  scale = false
}: FadeInProps) {
  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ 
        opacity: 0,
        y: offset.y,
        x: offset.x,
        scale: scale ? 0.98 : 1,
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: 0,
        scale: 1,
      }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </motion.div>
  );
});

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export const StaggerContainer = memo(function StaggerContainer({ 
  children, 
  className = '',
  staggerDelay = 0.08,
  initialDelay = 0
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  );
});

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = memo(function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { 
          opacity: 0, 
          y: 12,
        },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </motion.div>
  );
});
