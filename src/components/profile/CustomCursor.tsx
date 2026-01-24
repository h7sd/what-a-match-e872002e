import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorPosition {
  x: number;
  y: number;
}

interface Trail {
  id: number;
  x: number;
  y: number;
}

interface CustomCursorProps {
  color?: string;
  showTrail?: boolean;
}

export function CustomCursor({ color = '#8b5cf6', showTrail = true }: CustomCursorProps) {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [trails, setTrails] = useState<Trail[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      if (showTrail) {
        const newTrail: Trail = {
          id: trailIdRef.current++,
          x: e.clientX,
          y: e.clientY,
        };
        setTrails((prev) => [...prev.slice(-12), newTrail]);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [showTrail]);

  // Clean up old trails
  useEffect(() => {
    const interval = setInterval(() => {
      setTrails((prev) => prev.slice(-8));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (typeof window === 'undefined') return null;

  return (
    <>
      <style>{`
        * { cursor: none !important; }
      `}</style>
      
      {/* Trail */}
      <AnimatePresence>
        {showTrail && trails.map((trail, index) => (
          <motion.div
            key={trail.id}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed pointer-events-none z-[9998]"
            style={{
              left: trail.x - 4,
              top: trail.y - 4,
              width: 8,
              height: 8,
              backgroundColor: color,
              borderRadius: '50%',
              filter: 'blur(2px)',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main cursor */}
      {isVisible && (
        <>
          {/* Outer ring */}
          <motion.div
            className="fixed pointer-events-none z-[9999] rounded-full border-2"
            style={{
              borderColor: color,
              width: 32,
              height: 32,
              left: position.x - 16,
              top: position.y - 16,
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Inner dot */}
          <motion.div
            className="fixed pointer-events-none z-[9999] rounded-full"
            style={{
              backgroundColor: color,
              width: 6,
              height: 6,
              left: position.x - 3,
              top: position.y - 3,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
            }}
          />
        </>
      )}
    </>
  );
}
