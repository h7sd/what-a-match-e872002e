import { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

// Memoized to prevent unnecessary re-renders
export const FeatureCard = memo(function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: 0.3 + index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="group relative"
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    >
      {/* Hover glow effect - simplified for performance */}
      <div
        className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-75"
        style={{ transform: 'translateZ(0)' }}
      />
      
      {/* Card content - GPU accelerated */}
      <div 
        className="relative flex flex-col items-center p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 transition-all duration-200 group-hover:border-primary/30 group-hover:bg-card group-hover:-translate-y-2"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Icon container - simplified animation */}
        <div 
          className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20 transition-all duration-200 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:scale-105"
          style={{ transform: 'translateZ(0)' }}
        >
          <Icon className="w-7 h-7 text-primary transition-transform duration-200 group-hover:scale-110" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 transition-colors duration-200 group-hover:text-primary">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
});
