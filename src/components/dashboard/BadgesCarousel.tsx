import { useState } from 'react';
import { ChevronLeft, ChevronRight, Award, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

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

  const currentBadge = allBadges[currentIndex];

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold">Limited Badges</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        You've claimed all available limited badges. Check back later for more!
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {visibleBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full text-sm
                  ${badge.unlocked 
                    ? 'bg-primary/20 border border-primary/40' 
                    : 'bg-secondary/50 border border-border'
                  }
                  ${index === 0 && badge.unlocked ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
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
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">???</span>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleNext}
          disabled={currentIndex >= allBadges.length - 5}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(badges.length / totalBadges) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {badges.length} / {totalBadges} badges
        </p>
      </div>
    </div>
  );
}
