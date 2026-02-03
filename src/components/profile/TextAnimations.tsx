import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

// Shuffle Text Animation
interface ShuffleTextProps {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ShuffleText({ text, speed = 50, className = '', style }: ShuffleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(true);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  
  useEffect(() => {
    if (!isAnimating) return;
    
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(prev => 
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) return text[index];
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      
      if (iteration >= text.length) {
        clearInterval(interval);
        setIsAnimating(false);
      }
      
      iteration += 1/3;
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed, isAnimating]);
  
  return (
    <span 
      className={className} 
      style={style}
      onMouseEnter={() => setIsAnimating(true)}
    >
      {displayText}
    </span>
  );
}

// Fuzzy Text Animation
interface FuzzyTextProps {
  text: string;
  intensity?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FuzzyText({ text, intensity = 2, className = '', style }: FuzzyTextProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset({
        x: (Math.random() - 0.5) * intensity,
        y: (Math.random() - 0.5) * intensity,
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [intensity]);
  
  return (
    <span className={`relative inline-block ${className}`} style={style}>
      {/* Shadow layers */}
      <span 
        className="absolute inset-0 text-red-500/30"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {text}
      </span>
      <span 
        className="absolute inset-0 text-blue-500/30"
        style={{ transform: `translate(${-offset.x}px, ${-offset.y}px)` }}
      >
        {text}
      </span>
      {/* Main text */}
      <span className="relative">{text}</span>
    </span>
  );
}

// Decrypted Text Animation
interface DecryptedTextProps {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function DecryptedText({ text, speed = 30, className = '', style }: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const chars = '01!@#$%^&*<>[]{}|';
  
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);
  
  useEffect(() => {
    if (currentIndex >= text.length) return;
    
    let scrambleCount = 0;
    const maxScrambles = 5;
    
    const interval = setInterval(() => {
      if (scrambleCount < maxScrambles) {
        const scrambled = text
          .slice(0, currentIndex)
          .concat(chars[Math.floor(Math.random() * chars.length)])
          .concat(text.slice(currentIndex + 1).split('').map(c => c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]).join(''));
        setDisplayText(scrambled);
        scrambleCount++;
      } else {
        setDisplayText(text.slice(0, currentIndex + 1).concat(text.slice(currentIndex + 1).split('').map(c => c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]).join('')));
        setCurrentIndex(prev => prev + 1);
        scrambleCount = 0;
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, currentIndex, speed]);
  
  return (
    <span className={`font-mono ${className}`} style={style}>
      {displayText || text.split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('')}
    </span>
  );
}

// ASCII Text Animation
interface ASCIITextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

const asciiChars = ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫'];

export function ASCIIText({ text, className = '', style }: ASCIITextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [hovering, setHovering] = useState(false);
  
  useEffect(() => {
    if (!hovering) {
      setDisplayText(text);
      return;
    }
    
    const interval = setInterval(() => {
      setDisplayText(
        text.split('').map(char => {
          if (char === ' ') return ' ';
          return Math.random() > 0.7 
            ? asciiChars[Math.floor(Math.random() * asciiChars.length)]
            : char;
        }).join('')
      );
    }, 100);
    
    return () => clearInterval(interval);
  }, [text, hovering]);
  
  return (
    <span 
      className={`font-mono ${className}`} 
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {displayText}
    </span>
  );
}

// Wrapper component that selects animation type
export type TextAnimationType = 'none' | 'shuffle' | 'fuzzy' | 'decrypted' | 'ascii' | 'ascii-3d' | 'glitch';

interface AnimatedDisplayNameProps {
  text: string;
  animation: TextAnimationType;
  className?: string;
  style?: React.CSSProperties;
  asciiSize?: number;
  asciiWaves?: boolean;
}

export function AnimatedDisplayName({ 
  text, 
  animation, 
  className = '', 
  style,
  asciiSize = 8,
  asciiWaves = true
}: AnimatedDisplayNameProps) {
  switch (animation) {
    case 'shuffle':
      return <ShuffleText text={text} className={className} style={style} />;
    case 'fuzzy':
      return <FuzzyText text={text} className={className} style={style} />;
    case 'decrypted':
      return <DecryptedText text={text} className={className} style={style} />;
    case 'ascii':
      return <ASCIIText text={text} className={className} style={style} />;
    case 'ascii-3d':
      // For ASCII 3D, we use a lazy-loaded component to avoid loading Three.js for all users
      return (
        <ASCII3DWrapper 
          text={text} 
          className={className} 
          style={style} 
          asciiFontSize={asciiSize}
          enableWaves={asciiWaves}
        />
      );
    default:
      return <span className={className} style={style}>{text}</span>;
  }
}

// Lazy-loaded ASCII 3D wrapper to avoid loading Three.js for all users
import { lazy, Suspense } from 'react';
const ASCIITextEffect = lazy(() => import('./ASCIITextEffect'));

interface ASCII3DWrapperProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  asciiFontSize?: number;
  enableWaves?: boolean;
}

function ASCII3DWrapper({ text, className, style, asciiFontSize = 8, enableWaves = true }: ASCII3DWrapperProps) {
  // Calculate width based on text length to prevent pixelation
  const textLength = text.length;
  const minWidth = Math.max(280, textLength * 24);
  const height = 80;
  
  return (
    <Suspense fallback={<span className={className} style={style}>{text}</span>}>
      <div 
        className={className} 
        style={{ 
          ...style, 
          width: `${minWidth}px`, 
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ASCIITextEffect
          text={text}
          asciiFontSize={asciiFontSize}
          textFontSize={Math.min(180, Math.max(100, 1200 / textLength))}
          planeBaseHeight={8}
          enableWaves={enableWaves}
        />
      </div>
    </Suspense>
  );
}
