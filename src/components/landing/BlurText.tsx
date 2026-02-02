import { useRef, useMemo } from 'react';
import { motion, Variants, useInView } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  animationFrom?: { filter?: string; opacity?: number; y?: number };
  animationTo?: { filter?: string; opacity?: number; y?: number }[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
}

export function BlurText({
  text,
  delay = 100,
  className = '',
  animateBy = 'words',
  direction = 'bottom',
  threshold = 0.1,
  rootMargin = '-50px',
  animationFrom,
  animationTo,
  easing,
  onAnimationComplete,
}: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: rootMargin as any });

  const elements = useMemo(() => {
    return animateBy === 'words' ? text.split(' ') : text.split('');
  }, [text, animateBy]);

  const defaultFrom = useMemo(
    () =>
      animationFrom || {
        filter: 'blur(10px)',
        opacity: 0,
        y: direction === 'top' ? -30 : 30,
      },
    [animationFrom, direction]
  );

  const defaultTo = useMemo(
    () =>
      animationTo || [
        {
          filter: 'blur(5px)',
          opacity: 0.5,
          y: direction === 'top' ? -15 : 15,
        },
        { filter: 'blur(0px)', opacity: 1, y: 0 },
      ],
    [animationTo, direction]
  );

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const elementVariants: Variants = {
    hidden: defaultFrom,
    visible: {
      ...defaultTo[defaultTo.length - 1],
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.p
      ref={ref}
      className={`flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {elements.map((element, index) => (
        <motion.span
          key={`${element}-${index}`}
          variants={elementVariants}
          className="inline-block"
          style={{ marginRight: animateBy === 'words' ? '0.3em' : undefined }}
          onAnimationComplete={
            index === elements.length - 1 ? onAnimationComplete : undefined
          }
        >
          {element === ' ' ? '\u00A0' : element}
        </motion.span>
      ))}
    </motion.p>
  );
}
