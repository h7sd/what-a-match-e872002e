import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  showAurora?: boolean;
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
  animateNumber = true,
  showAurora = true
}: StatCardProps) {
  const colorStyles = {
    primary: {
      gradient: 'from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20',
      border: 'border-[#00D9A5]/20',
      text: 'text-[#00D9A5]',
    },
    blue: {
      gradient: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/10',
      text: 'text-blue-400',
    },
    amber: {
      gradient: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/10',
      text: 'text-amber-400',
    },
    rose: {
      gradient: 'from-rose-500/20 to-rose-500/5',
      border: 'border-rose-500/10',
      text: 'text-rose-400',
    },
    emerald: {
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/10',
      text: 'text-emerald-400',
    }
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5 group"
      whileHover={{ borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Static gradient background instead of Aurora for performance */}
      {showAurora && (
        <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500 bg-gradient-to-br from-[#00B4D8]/30 via-[#00D9A5]/20 to-[#0077B6]/30" />
      )}

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
