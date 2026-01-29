import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: boolean;
  delay?: number;
}

export const AnimatedButton = memo(function AnimatedButton({ 
  to, 
  children, 
  variant = 'primary',
  icon = false,
  delay = 0
}: AnimatedButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'transform, opacity' }}
    >
      <Link to={to}>
        <button
          className={`
            relative group px-8 py-3.5 rounded-xl font-medium text-base
            transition-all duration-200 overflow-hidden
            active:scale-[0.98] hover:scale-[1.02]
            ${isPrimary 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
              : 'bg-card border border-border text-foreground hover:border-primary/50'
            }
          `}
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          {/* Shimmer effect for primary button - CSS only */}
          {isPrimary && (
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"
              style={{ transform: 'translateZ(0)' }}
            />
          )}
          
          {/* Glow effect on hover */}
          {isPrimary && (
            <span
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{
                boxShadow: '0 0 25px hsl(var(--primary) / 0.4)',
              }}
            />
          )}
          
          <span className="relative flex items-center gap-2">
            {children}
            {icon && (
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </span>
        </button>
      </Link>
    </motion.div>
  );
});

interface NavButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'ghost' | 'solid';
}

export const NavButton = memo(function NavButton({ to, children, variant = 'solid' }: NavButtonProps) {
  const isGhost = variant === 'ghost';
  
  return (
    <Link to={to}>
      <button
        className={`
          px-5 py-2 rounded-lg font-medium text-sm
          transition-all duration-150 active:scale-[0.98] hover:scale-[1.02]
          ${isGhost 
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }
        `}
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        {children}
      </button>
    </Link>
  );
});
