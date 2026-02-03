import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import Aurora from '@/components/ui/Aurora';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  showAurora?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({
  children,
  className,
  hoverEffect = true,
  showAurora = false,
  padding = 'md'
}: GlassCardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  }[padding];

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl group',
        paddingClass,
        className
      )}
      whileHover={hoverEffect ? { borderColor: 'rgba(255,255,255,0.12)', y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {/* Aurora background effect */}
      {showAurora && (
        <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500">
          <Aurora
            colorStops={['#00B4D8', '#00D9A5', '#0077B6']}
            amplitude={0.8}
            blend={0.6}
            speed={0.5}
          />
        </div>
      )}
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20 flex items-center justify-center border border-[#00D9A5]/20">
            <Icon className="w-4 h-4 text-[#00D9A5]" />
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
