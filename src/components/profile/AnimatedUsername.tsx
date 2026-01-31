import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

export type UsernameEffect = 
  | 'none'
  | 'rainbow'
  | 'glow-pulse'
  | 'wave'
  | 'shine'
  | 'glitch'
  | 'typewriter'
  | 'sparkle'
  | 'neon-flicker'
  | 'gradient-shift';

interface AnimatedUsernameProps {
  text: string;
  effect?: UsernameEffect;
  accentColor?: string;
  className?: string;
  fontFamily?: string;
  enableRainbow?: boolean;
  enableGlow?: boolean;
  enableTypewriter?: boolean;
  enableGlitch?: boolean;
  enableSparkles?: boolean;
}

export function AnimatedUsername({
  text,
  effect = 'none',
  accentColor = '#8b5cf6',
  className = '',
  fontFamily = 'Inter',
  enableRainbow = false,
  enableGlow = false,
  enableTypewriter = false,
  enableGlitch = false,
  enableSparkles = false,
}: AnimatedUsernameProps) {
  // Determine effect based on individual toggles
  const activeEffect = useMemo(() => {
    if (enableRainbow) return 'rainbow';
    if (enableGlow) return 'glow-pulse';
    if (enableTypewriter) return 'typewriter';
    if (enableGlitch) return 'glitch';
    if (enableSparkles) return 'sparkle';
    return effect;
  }, [enableRainbow, enableGlow, enableTypewriter, enableGlitch, enableSparkles, effect]);

  switch (activeEffect) {
    case 'rainbow':
      return <RainbowText text={text} className={className} fontFamily={fontFamily} />;
    case 'glow-pulse':
      return <GlowPulseText text={text} accentColor={accentColor} className={className} fontFamily={fontFamily} />;
    case 'wave':
      return <WaveText text={text} accentColor={accentColor} className={className} fontFamily={fontFamily} />;
    case 'shine':
      return <ShineText text={text} className={className} fontFamily={fontFamily} />;
    case 'glitch':
      return <GlitchTextEffect text={text} className={className} fontFamily={fontFamily} />;
    case 'typewriter':
      return <TypewriterText text={text} className={className} fontFamily={fontFamily} />;
    case 'sparkle':
      return <SparkleText text={text} accentColor={accentColor} className={className} fontFamily={fontFamily} />;
    case 'neon-flicker':
      return <NeonFlickerText text={text} accentColor={accentColor} className={className} fontFamily={fontFamily} />;
    case 'gradient-shift':
      return <GradientShiftText text={text} className={className} fontFamily={fontFamily} />;
    default:
      return <span className={className} style={{ fontFamily }}>{text}</span>;
  }
}

// Rainbow Gradient - Animierter Regenbogen
function RainbowText({ text, className, fontFamily }: { text: string; className: string; fontFamily: string }) {
  return (
    <motion.span
      className={`${className} inline-block`}
      style={{
        fontFamily,
        background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff, #ff0000)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '200% 50%'],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {text}
    </motion.span>
  );
}

// Glow Pulse - Pulsierender Glow-Effekt
function GlowPulseText({ text, accentColor, className, fontFamily }: { text: string; accentColor: string; className: string; fontFamily: string }) {
  return (
    <motion.span
      className={`${className} inline-block`}
      style={{ fontFamily, color: 'white' }}
      animate={{
        textShadow: [
          `0 0 10px ${accentColor}40, 0 0 20px ${accentColor}20`,
          `0 0 20px ${accentColor}80, 0 0 40px ${accentColor}40, 0 0 60px ${accentColor}20`,
          `0 0 10px ${accentColor}40, 0 0 20px ${accentColor}20`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {text}
    </motion.span>
  );
}

// Wave Text - Buchstaben bewegen sich wellenförmig
function WaveText({ text, accentColor, className, fontFamily }: { text: string; accentColor: string; className: string; fontFamily: string }) {
  return (
    <span className={`${className} inline-flex`} style={{ fontFamily }}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ 
            color: 'white',
            textShadow: `0 0 10px ${accentColor}40`,
          }}
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

// Shine Text - Glänzender Sweep-Effekt
function ShineText({ text, className, fontFamily }: { text: string; className: string; fontFamily: string }) {
  return (
    <motion.span
      className={`${className} inline-block relative overflow-hidden`}
      style={{
        fontFamily,
        color: 'white',
        background: 'linear-gradient(90deg, white 0%, white 40%, #ffd700 50%, white 60%, white 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['-100% 0%', '200% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
        repeatDelay: 1,
      }}
    >
      {text}
    </motion.span>
  );
}

// Glitch Text Effect - Cyberpunk-Style Glitch
function GlitchTextEffect({ text, className, fontFamily }: { text: string; className: string; fontFamily: string }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.span
      className={`${className} inline-block relative`}
      style={{ fontFamily, color: 'white' }}
      animate={isGlitching ? {
        x: [0, -3, 3, -2, 2, 0],
        textShadow: [
          '0 0 0 transparent',
          '-3px 0 0 #ff0000, 3px 0 0 #00ffff',
          '3px 0 0 #ff0000, -3px 0 0 #00ffff',
          '-2px 0 0 #ff0000, 2px 0 0 #00ffff',
          '0 0 0 transparent',
        ],
      } : {}}
      transition={{ duration: 0.2 }}
    >
      {text}
      {isGlitching && (
        <>
          <motion.span
            className="absolute inset-0"
            style={{ 
              fontFamily, 
              color: '#ff0000', 
              opacity: 0.8,
              clipPath: 'inset(20% 0 30% 0)',
            }}
            animate={{ x: [-2, 2, -2] }}
            transition={{ duration: 0.1 }}
          >
            {text}
          </motion.span>
          <motion.span
            className="absolute inset-0"
            style={{ 
              fontFamily, 
              color: '#00ffff', 
              opacity: 0.8,
              clipPath: 'inset(60% 0 10% 0)',
            }}
            animate={{ x: [2, -2, 2] }}
            transition={{ duration: 0.1 }}
          >
            {text}
          </motion.span>
        </>
      )}
    </motion.span>
  );
}

// Typewriter Text - Tipp-Animation
function TypewriterText({ text, className, fontFamily }: { text: string; className: string; fontFamily: string }) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setDisplayText('');
          i = 0;
        }, 2000);
      }
    }, 100);

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, [text]);

  return (
    <span className={`${className} inline-block`} style={{ fontFamily, color: 'white' }}>
      {displayText}
      <span className={showCursor ? 'opacity-100' : 'opacity-0'}>|</span>
    </span>
  );
}

// Sparkle Text - Mit funkelnden Sternen
function SparkleText({ text, accentColor, className, fontFamily }: { text: string; accentColor: string; className: string; fontFamily: string }) {
  const sparkles = useMemo(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
    })), []);

  return (
    <span className={`${className} inline-block relative`} style={{ fontFamily, color: 'white' }}>
      {text}
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="absolute pointer-events-none text-xs"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            color: accentColor,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: sparkle.delay,
          }}
        >
          ✦
        </motion.span>
      ))}
    </span>
  );
}

// Neon Flicker - Neon-Schild-Flackern
function NeonFlickerText({ text, accentColor, className, fontFamily }: { text: string; accentColor: string; className: string; fontFamily: string }) {
  return (
    <motion.span
      className={`${className} inline-block`}
      style={{
        fontFamily,
        color: accentColor,
        textShadow: `0 0 5px ${accentColor}, 0 0 10px ${accentColor}, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}`,
      }}
      animate={{
        opacity: [1, 0.8, 1, 0.9, 1, 0.85, 1],
        textShadow: [
          `0 0 5px ${accentColor}, 0 0 10px ${accentColor}, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}`,
          `0 0 2px ${accentColor}, 0 0 5px ${accentColor}, 0 0 10px ${accentColor}`,
          `0 0 5px ${accentColor}, 0 0 10px ${accentColor}, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}`,
          `0 0 3px ${accentColor}, 0 0 8px ${accentColor}, 0 0 15px ${accentColor}`,
          `0 0 5px ${accentColor}, 0 0 10px ${accentColor}, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        times: [0, 0.1, 0.2, 0.4, 0.5, 0.7, 1],
      }}
    >
      {text}
    </motion.span>
  );
}

// Gradient Shift - Farbverlauf der sich verschiebt
function GradientShiftText({ text, className, fontFamily }: { text: string; className: string; fontFamily: string }) {
  return (
    <motion.span
      className={`${className} inline-block`}
      style={{
        fontFamily,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #667eea 100%)',
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {text}
    </motion.span>
  );
}
