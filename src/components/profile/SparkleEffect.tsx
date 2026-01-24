import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
}

export function SparkleEffect() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSparkle: Sparkle = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        duration: Math.random() * 1 + 1,
      };

      setSparkles((prev) => [...prev.slice(-15), newSparkle]);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: sparkle.duration }}
            className="absolute"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: sparkle.size,
              height: sparkle.size,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-full h-full"
            >
              <path
                d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                fill="url(#sparkle-gradient)"
              />
              <defs>
                <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
