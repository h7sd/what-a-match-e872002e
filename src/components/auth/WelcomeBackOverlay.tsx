import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LaserFlow } from '@/components/ui/LaserFlow';

interface WelcomeBackOverlayProps {
  username: string;
  onComplete: () => void;
}

export function WelcomeBackOverlay({ username, onComplete }: WelcomeBackOverlayProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          onClick={() => setShow(false)}
        >
          {/* LaserFlow Background */}
          <div className="absolute inset-0 bg-black">
            <LaserFlow
              color="#00B4D8"
              horizontalBeamOffset={0.0}
              verticalBeamOffset={0.15}
              wispDensity={1.2}
              wispSpeed={12}
              wispIntensity={4}
              flowSpeed={0.4}
              flowStrength={0.3}
              fogIntensity={0.5}
              fogScale={0.25}
              decay={1.2}
              falloffStart={1.3}
              verticalSizing={2.5}
              horizontalSizing={0.6}
            />
          </div>
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
          
          {/* Welcome Text */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="relative z-10 text-center px-6"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg md:text-xl text-white/70 mb-2 font-light tracking-wide"
            >
              Welcome back
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #00B4D8 0%, #00D9A5 50%, #0077B6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 60px rgba(0, 180, 216, 0.3)',
              }}
            >
              {username}
            </motion.h1>
            
            {/* Subtle hint to click */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="text-sm text-white/40 mt-8 font-light"
            >
              Click anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
