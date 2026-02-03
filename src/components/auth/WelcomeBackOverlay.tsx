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
  const [show, setShow] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [laserVisible, setLaserVisible] = useState(false);

  const handleExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setShow(false);
    }, 350);
  }, [isExiting]);

  useEffect(() => {
    // Fade in laser smoothly first
    const showLaser = setTimeout(() => setLaserVisible(true), 50);
    // Then show content
    const showContent = setTimeout(() => setContentVisible(true), 200);
    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(handleExit, 2500);
    return () => {
      clearTimeout(showLaser);
      clearTimeout(showContent);
      clearTimeout(timer);
    };
  }, [handleExit]);

  useEffect(() => {
    if (!show) {
      const completeTimer = setTimeout(onComplete, 50);
      return () => clearTimeout(completeTimer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleExit}
      style={{
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        willChange: 'opacity',
        background: '#0a0a0b',
      }}
    >
      {/* LaserFlow WebGL Background with smooth fade */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: laserVisible && !isExiting ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
          willChange: 'opacity',
        }}
      >
        <MemoizedLaserFlow />
      </div>
      
      {/* Welcome Text with CSS transitions */}
      <div 
        className="relative z-10 text-center px-6"
        style={{
          opacity: contentVisible && !isExiting ? 1 : 0,
          transform: contentVisible && !isExiting 
            ? 'translateY(0) scale(1)' 
            : isExiting 
              ? 'translateY(-15px) scale(0.97)' 
              : 'translateY(20px) scale(0.98)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, opacity',
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
        
        {/* Subtle hint */}
        <p 
          className="text-sm text-white/40 mt-8 font-light"
          style={{
            opacity: contentVisible ? 0.5 : 0,
            transition: 'opacity 0.5s ease-out 1s',
          }}
        >
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}
