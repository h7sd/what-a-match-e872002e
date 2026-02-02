import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Award, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

interface Badge {
  id: string;
  name: string;
  icon_url?: string | null;
  color?: string | null;
  description?: string | null;
  unlocked?: boolean;
}

interface BadgesCarouselProps {
  badges: Badge[];
  totalBadges?: number;
}

export function BadgesCarousel({ badges, totalBadges = 10 }: BadgesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 500, damping: 100 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 100 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Create placeholder badges for locked ones
  const allBadges: Badge[] = [
    ...badges.map(b => ({ ...b, unlocked: true })),
    ...Array(Math.max(0, totalBadges - badges.length)).fill(null).map((_, i) => ({
      id: `locked-${i}`,
      name: '???',
      unlocked: false,
    })),
  ];

  const visibleBadges = allBadges.slice(currentIndex, currentIndex + 5);

  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(allBadges.length - 5, currentIndex + 1));
  };

  const progressPercent = Math.min((badges.length / totalBadges) * 100, 100);

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 space-y-4"
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(139, 92, 246, 0.08), transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center border border-purple-500/20">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">Limited Badges</h3>
            <p className="text-xs text-white/40">Collect rare achievements</p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">{badges.length}/{totalBadges}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 my-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/[0.06]"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 flex items-center gap-2 overflow-hidden py-1">
            <AnimatePresence mode="popLayout">
              {visibleBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                    transition-all duration-200
                    ${badge.unlocked 
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-white' 
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/40'
                    }
                    ${index === 0 && badge.unlocked ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[#0a0a0b]' : ''}
                  `}
                >
                  {badge.unlocked ? (
                    <>
                      {badge.icon_url ? (
                        <img src={badge.icon_url} alt={badge.name} className="w-4 h-4" />
                      ) : (
                        <Award className="w-4 h-4 text-primary" />
                      )}
                      <span className="whitespace-nowrap">{badge.name}</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4" />
                      <span>???</span>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/[0.06]"
            onClick={handleNext}
            disabled={currentIndex >= allBadges.length - 5}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-500 to-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-white/30 text-right">
            {badges.length === totalBadges ? 'All badges collected!' : `${totalBadges - badges.length} more to unlock`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
