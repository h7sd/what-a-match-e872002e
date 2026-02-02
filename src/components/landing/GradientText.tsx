import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export function GradientText({
  children,
  className = '',
  colors = ['#00D9A5', '#00B4D8', '#0077B6', '#00D9A5'],
  animationSpeed = 6,
  showBorder = false,
}: GradientTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: '300% 100%',
  };

  return (
    <motion.span
      ref={ref}
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={gradientStyle}
      initial={{ backgroundPosition: '0% 50%', opacity: 0 }}
      animate={
        isInView
          ? {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              opacity: 1,
            }
          : { opacity: 0 }
      }
      transition={{
        backgroundPosition: {
          duration: animationSpeed,
          repeat: Infinity,
          ease: 'linear',
        },
        opacity: { duration: 0.6 },
      }}
    >
      {showBorder && (
        <span
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(90deg, ${colors.join(', ')})`,
            backgroundSize: '300% 100%',
            padding: '2px',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}
      {children}
    </motion.span>
  );
}
