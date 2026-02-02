import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode, useRef } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({
  children,
  className,
  hoverEffect = true,
  glowColor = 'rgba(0, 217, 165, 0.08)',
  padding = 'md'
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightX = useSpring(mouseX, { stiffness: 400, damping: 80 });
  const spotlightY = useSpring(mouseY, { stiffness: 400, damping: 80 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !hoverEffect) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    mouseX.set(ref.current.offsetWidth / 2);
    mouseY.set(ref.current.offsetHeight / 2);
  };

  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  }[padding];

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl',
        paddingClass,
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={hoverEffect ? { borderColor: 'rgba(255,255,255,0.1)' } : undefined}
      transition={{ duration: 0.2 }}
    >
      {/* Spotlight effect */}
      {hoverEffect && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(500px circle at ${spotlightX}px ${spotlightY}px, ${glowColor}, transparent 40%)`,
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface GlassCardHeaderProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function GlassCardHeader({ icon: Icon, title, description, action }: GlassCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          {description && (
            <p className="text-xs text-white/40">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
