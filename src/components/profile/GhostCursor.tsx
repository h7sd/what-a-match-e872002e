import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface GhostCursorProps {
  color?: string;
  trailLength?: number;
  inertia?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

export function GhostCursor({ 
  color = '#8b5cf6',
  trailLength = 20,
  inertia = 0.5,
}: GhostCursorProps) {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 28 });
  const lastPosition = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastPosition.current.x;
      const deltaY = e.clientY - lastPosition.current.y;
      
      velocity.current = {
        x: velocity.current.x * inertia + deltaX * (1 - inertia),
        y: velocity.current.y * inertia + deltaY * (1 - inertia),
      };
      
      lastPosition.current = { x: e.clientX, y: e.clientY };
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const updateTrail = () => {
      setTrail(prevTrail => {
        const newPoint = {
          x: lastPosition.current.x,
          y: lastPosition.current.y,
          opacity: 1,
        };
        
        const updatedTrail = [newPoint, ...prevTrail.slice(0, trailLength - 1)].map((point, index) => ({
          ...point,
          opacity: 1 - (index / trailLength),
        }));
        
        return updatedTrail;
      });
      
      animationRef.current = requestAnimationFrame(updateTrail);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationRef.current = requestAnimationFrame(updateTrail);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cursorX, cursorY, inertia, trailLength]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Trail */}
      {trail.map((point, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            left: point.x,
            top: point.y,
            width: 12 - (index * 0.4),
            height: 12 - (index * 0.4),
            backgroundColor: color,
            opacity: point.opacity * 0.5,
            filter: `blur(${index * 0.3}px)`,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${10 + index * 2}px ${color}`,
          }}
        />
      ))}
      
      {/* Main cursor */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: springX,
          top: springY,
          width: 16,
          height: 16,
          backgroundColor: color,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}50`,
        }}
      />
    </div>
  );
}
