import { useState, useEffect, useCallback, memo } from 'react';
import { LaserFlow } from '@/components/ui/LaserFlow';

interface WelcomeBackOverlayProps {
  username: string;
  onComplete: () => void;
}

// Memoized LaserFlow to prevent re-renders
const MemoizedLaserFlow = memo(() => (
  <LaserFlow
    wispDensity={0.6}
    dpr={1}
    mouseSmoothTime={0}
    mouseTiltStrength={0.005}
    horizontalBeamOffset={0}
    verticalBeamOffset={0.15}
    flowSpeed={0.2}
    verticalSizing={1.8}
    horizontalSizing={0.4}
    fogIntensity={0.3}
    fogScale={0.25}
    wispSpeed={10}
    wispIntensity={3}
    flowStrength={0.2}
    decay={1.0}
    falloffStart={1.0}
    fogFallSpeed={0.4}
    color="#00D9A5"
  />
));
MemoizedLaserFlow.displayName = 'MemoizedLaserFlow';

export function WelcomeBackOverlay({ username, onComplete }: WelcomeBackOverlayProps) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting' | 'hidden'>('entering');

  const handleExit = useCallback(() => {
    if (phase === 'exiting' || phase === 'hidden') return;
    setPhase('exiting');
  }, [phase]);

  useEffect(() => {
    // Simple timeline: enter -> visible -> auto-exit
    const enterTimer = setTimeout(() => setPhase('visible'), 50);
    const exitTimer = setTimeout(handleExit, 2500);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [handleExit]);

  useEffect(() => {
    if (phase === 'exiting') {
      const hideTimer = setTimeout(() => setPhase('hidden'), 400);
      return () => clearTimeout(hideTimer);
    }
    if (phase === 'hidden') {
      onComplete();
    }
  }, [phase, onComplete]);

  if (phase === 'hidden') return null;

  const isVisible = phase === 'visible';
  const isExiting = phase === 'exiting';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer bg-[#0a0a0b]"
      onClick={handleExit}
    >
      {/* LaserFlow with CSS animation class */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: isExiting ? 0 : isVisible ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <MemoizedLaserFlow />
      </div>
      
      {/* Welcome Text */}
      <div 
        className="relative z-10 text-center px-6"
        style={{
          opacity: isExiting ? 0 : isVisible ? 1 : 0,
          transform: isExiting 
            ? 'translateY(-10px)' 
            : isVisible 
              ? 'translateY(0)' 
              : 'translateY(15px)',
          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
        }}
      >
        <p className="text-lg md:text-xl text-white/70 mb-2 font-light tracking-wide">
          Welcome back
        </p>
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #00B4D8 0%, #00D9A5 50%, #0077B6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(0, 180, 216, 0.3))',
          }}
        >
          {username}
        </h1>
        
        <p 
          className="text-sm text-white/40 mt-8 font-light"
          style={{
            opacity: isVisible && !isExiting ? 0.5 : 0,
            transition: 'opacity 0.4s ease-out 0.8s',
          }}
        >
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}
