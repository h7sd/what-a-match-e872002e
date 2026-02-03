import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeBackOverlayProps {
  username: string;
  onComplete: () => void;
}

export function WelcomeBackOverlay({ username, onComplete }: WelcomeBackOverlayProps) {
  const [show, setShow] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    // Start fade out, then hide after animation
    setTimeout(() => {
      setShow(false);
    }, 400);
  }, [isExiting]);

  useEffect(() => {
    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(handleExit, 2500);
    return () => clearTimeout(timer);
  }, [handleExit]);

  // Call onComplete after exit animation finishes
  useEffect(() => {
    if (!show) {
      const completeTimer = setTimeout(onComplete, 100);
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
        transition: 'opacity 0.4s ease-out',
        willChange: 'opacity',
      }}
    >
      {/* Simple gradient background instead of heavy WebGL */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #0a2a3a 0%, #0a0a0b 70%)',
        }}
      />
      
      {/* Animated gradient orbs - CSS only, no JS */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0,180,216,0.3) 0%, transparent 70%)',
            top: '30%',
            left: '30%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(0,217,165,0.25) 0%, transparent 70%)',
            bottom: '20%',
            right: '20%',
            animation: 'pulse 4s ease-in-out infinite 0.5s',
          }}
        />
      </div>
      
      {/* Subtle scanlines effect - pure CSS */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,180,216,0.1) 2px, rgba(0,180,216,0.1) 4px)',
        }}
      />
      
      {/* Welcome Text - simple CSS animations */}
      <div 
        className="relative z-10 text-center px-6"
        style={{
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'translateY(-20px) scale(0.95)' : 'translateY(0) scale(1)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <p 
          className="text-lg md:text-xl text-white/70 mb-2 font-light tracking-wide"
          style={{
            animation: 'fadeSlideIn 0.5s ease-out 0.1s both',
          }}
        >
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
            animation: 'fadeSlideIn 0.6s ease-out 0.2s both',
          }}
        >
          {username}
        </h1>
        
        {/* Subtle hint */}
        <p 
          className="text-sm text-white/40 mt-8 font-light"
          style={{
            animation: 'fadeIn 0.5s ease-out 1.5s both',
          }}
        >
          Click anywhere to continue
        </p>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
