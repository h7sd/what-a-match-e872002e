import { motion } from 'framer-motion';

interface GradientOrbProps {
  className?: string;
  color?: 'purple' | 'pink' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}

export function GradientOrb({ 
  className = '', 
  color = 'purple',
  size = 'md',
  delay = 0
}: GradientOrbProps) {
  const colors = {
    purple: 'from-purple-500/30 via-purple-600/20 to-transparent',
    pink: 'from-pink-500/30 via-pink-600/20 to-transparent',
    blue: 'from-blue-500/30 via-blue-600/20 to-transparent',
  };

  const sizes = {
    sm: 'w-64 h-64',
    md: 'w-96 h-96',
    lg: 'w-[32rem] h-[32rem]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
      }}
      transition={{ 
        duration: 1.5, 
        delay,
        ease: 'easeOut'
      }}
      className={`absolute rounded-full bg-gradient-radial ${colors[color]} ${sizes[size]} blur-3xl pointer-events-none ${className}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full"
      />
    </motion.div>
  );
}

export function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      
      {/* Radial fade */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)',
        }}
      />
    </div>
  );
}

export function NoiseTexture() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
