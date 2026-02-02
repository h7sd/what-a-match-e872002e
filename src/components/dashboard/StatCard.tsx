import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode, useRef, useEffect, useState } from 'react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'blue' | 'amber' | 'rose' | 'emerald';
  animateNumber?: boolean;
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = 1 - Math.pow(2, -10 * progress);
      
      setDisplayValue(Math.round(startValue + diff * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  color = 'primary',
  animateNumber = true
}: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightX = useSpring(mouseX, { stiffness: 400, damping: 80 });
  const spotlightY = useSpring(mouseY, { stiffness: 400, damping: 80 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const colorStyles = {
    primary: {
      gradient: 'from-primary/20 to-primary/5',
      border: 'border-primary/10',
      text: 'text-primary',
      glow: 'rgba(0, 217, 165, 0.1)'
    },
    blue: {
      gradient: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/10',
      text: 'text-blue-400',
      glow: 'rgba(59, 130, 246, 0.1)'
    },
    amber: {
      gradient: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/10',
      text: 'text-amber-400',
      glow: 'rgba(245, 158, 11, 0.1)'
    },
    rose: {
      gradient: 'from-rose-500/20 to-rose-500/5',
      border: 'border-rose-500/10',
      text: 'text-rose-400',
      glow: 'rgba(244, 63, 94, 0.1)'
    },
    emerald: {
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/10',
      text: 'text-emerald-400',
      glow: 'rgba(16, 185, 129, 0.1)'
    }
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 group"
      onMouseMove={handleMouseMove}
      whileHover={{ borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${spotlightX}px ${spotlightY}px, ${styles.glow}, transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center border',
            styles.gradient,
            styles.border
          )}>
            <Icon className={cn('w-5 h-5', styles.text)} />
          </div>
          
          {trend && (
            <div className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              trend.isPositive 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 text-rose-400'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {typeof value === 'number' && animateNumber ? (
                <AnimatedNumber value={value} />
              ) : (
                value
              )}
            </span>
            {suffix && (
              <span className="text-sm text-white/40">{suffix}</span>
            )}
          </div>
          <p className="text-sm text-white/50">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
