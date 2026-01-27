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

export function AnimatedButton({ 
  to, 
  children, 
  variant = 'primary',
  icon = false,
  delay = 0
}: AnimatedButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link to={to}>
        <motion.button
          className={`
            relative group px-8 py-3.5 rounded-xl font-medium text-base
            transition-all duration-300 overflow-hidden
            ${isPrimary 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
              : 'bg-card border border-border text-foreground hover:border-primary/50'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Shimmer effect for primary button */}
          {isPrimary && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            />
          )}
          
          {/* Glow effect on hover */}
          {isPrimary && (
            <motion.div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow: '0 0 30px hsl(var(--primary) / 0.5)',
              }}
            />
          )}
          
          <span className="relative flex items-center gap-2">
            {children}
            {icon && (
              <motion.span
                className="inline-block"
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            )}
          </span>
        </motion.button>
      </Link>
    </motion.div>
  );
}

interface NavButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'ghost' | 'solid';
}

export function NavButton({ to, children, variant = 'solid' }: NavButtonProps) {
  const isGhost = variant === 'ghost';
  
  return (
    <Link to={to}>
      <motion.button
        className={`
          px-5 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${isGhost 
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.button>
    </Link>
  );
}
