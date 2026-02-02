import { useMemo } from 'react';
import { motion, Variants, useInView } from 'framer-motion';
import { useRef } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity?: number; transform?: string };
  animationTo?: { opacity?: number; transform?: string };
  easing?: string;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  onLetterAnimationComplete?: () => void;
}

export function SplitText({
  text,
  className = '',
  delay = 50,
  animationFrom = { opacity: 0, transform: 'translate3d(0,40px,0)' },
  animationTo = { opacity: 1, transform: 'translate3d(0,0,0)' },
  easing = 'easeOut',
  threshold = 0.1,
  rootMargin = '-50px',
  textAlign = 'center',
  onLetterAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: rootMargin as any });

  const words = useMemo(() => text.split(' '), [text]);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: animationFrom,
    visible: {
      ...animationTo,
      transition: {
        duration: 0.5,
        ease: easing as any,
      },
    },
  };

  return (
    <motion.p
      ref={ref}
      className={`flex flex-wrap gap-x-2 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordVariants}
          className="inline-block"
          onAnimationComplete={
            index === words.length - 1 ? onLetterAnimationComplete : undefined
          }
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}
