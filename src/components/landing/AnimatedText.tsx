import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  gradient?: boolean;
}

export function AnimatedText({ text, className = '', delay = 0, gradient = false }: AnimatedTextProps) {
  const words = text.split(' ');
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay },
    }),
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(10px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap justify-center ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          className={`mr-2 ${gradient ? 'gradient-text' : ''}`}
          variants={child}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

interface BlurFadeTextProps {
  text: string;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down';
}

export function BlurFadeText({ text, className = '', delay = 0, direction = 'up' }: BlurFadeTextProps) {
  return (
    <motion.span
      initial={{ 
        opacity: 0, 
        y: direction === 'up' ? 20 : -20,
        filter: 'blur(10px)'
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        filter: 'blur(0px)'
      }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
    >
      {text}
    </motion.span>
  );
}

interface LetterPullupProps {
  text: string;
  className?: string;
  delay?: number;
}

export function LetterPullup({ text, className = '', delay = 0 }: LetterPullupProps) {
  const letters = text.split('');
  
  return (
    <span className={className}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: delay + index * 0.03,
            type: 'spring',
            stiffness: 150,
            damping: 20,
          }}
          className="inline-block"
          style={{ whiteSpace: letter === ' ' ? 'pre' : 'normal' }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}

interface GradientTextAnimatedProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientTextAnimated({ children, className = '' }: GradientTextAnimatedProps) {
  return (
    <span 
      className={`bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 bg-[length:200%_auto] animate-gradient ${className}`}
      style={{
        animation: 'gradient-x 3s ease infinite',
      }}
    >
      {children}
    </span>
  );
}
