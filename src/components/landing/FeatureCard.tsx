import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        duration: 0.5, 
        delay: 0.4 + index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      className="group relative"
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
        initial={false}
      />
      
      {/* Card content */}
      <div className="relative flex flex-col items-center p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 transition-all duration-300 group-hover:border-primary/30 group-hover:bg-card">
        {/* Icon container */}
        <motion.div 
          className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/40"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
        </motion.div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {description}
        </p>
        
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          />
        </div>
      </div>
    </motion.div>
  );
}
