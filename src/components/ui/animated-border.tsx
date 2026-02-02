import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AnimatedBorderProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  duration?: number;
}

export function AnimatedBorder({
  children,
  className,
  containerClassName,
  borderRadius = '1rem',
  duration = 3,
}: AnimatedBorderProps) {
  return (
    <div
      className={cn('relative p-[1px] overflow-hidden', containerClassName)}
      style={{ borderRadius }}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(160 85% 45%), hsl(190 85% 55%), hsl(var(--primary)))',
          backgroundSize: '300% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Inner content */}
      <div
        className={cn('relative bg-card', className)}
        style={{ borderRadius: `calc(${borderRadius} - 1px)` }}
      >
        {children}
      </div>
    </div>
  );
}
