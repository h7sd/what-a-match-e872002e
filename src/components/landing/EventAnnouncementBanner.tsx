import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, X, Skull, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHuntBadgeHolder } from '@/hooks/useHuntBadgeHolder';

interface BadgeEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  is_active: boolean;
  steal_duration_hours: number;
  target_badge_id: string | null;
}

function HuntButton({ event }: { event: BadgeEvent }) {
  const { data: holder, isLoading } = useHuntBadgeHolder(event.id);
  
  if (event.event_type !== 'hunt') {
    return (
      <Link 
        to="/" 
        className="group relative overflow-hidden px-2 py-px bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-full text-[10px] font-bold transition-all duration-300 border border-white/20 hover:border-white/40 hover:scale-105"
      >
        <span className="relative z-10 flex items-center gap-0.5">
          <Skull className="w-2.5 h-2.5" />
          Steal
        </span>
      </Link>
    );
  }
  
  if (isLoading) {
    return (
      <span className="px-2 py-px bg-black/30 backdrop-blur-sm rounded-full text-[10px] font-bold border border-white/20 opacity-60">
        <span className="flex items-center gap-0.5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Crosshair className="w-2.5 h-2.5" />
          </motion.div>
          ...
        </span>
      </span>
    );
  }
  
  if (!holder?.username) {
    return (
      <span className="px-2 py-px bg-black/30 backdrop-blur-sm rounded-full text-[10px] font-bold border border-white/20 opacity-60">
        <span className="flex items-center gap-0.5">
          <Crosshair className="w-2.5 h-2.5" />
          No holder
        </span>
      </span>
    );
  }
  
  const handleHuntClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = `/${holder.username}`;
  };
  
  return (
    <motion.button 
      onClick={handleHuntClick}
      className="group relative overflow-hidden px-2 py-px bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-full text-[10px] font-bold transition-all duration-300 border border-white/20 hover:border-white/40 cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative z-10 flex items-center gap-0.5">
        <Crosshair className="w-2.5 h-2.5" />
        Hunt @{holder.username}
      </span>
    </motion.button>
  );
}

export function EventAnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: activeEvents = [] } = useQuery({
    queryKey: ['activeEvents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BadgeEvent[];
    },
    refetchInterval: 30000,
  });

  const visibleEvents = activeEvents.filter(e => !dismissed.includes(e.id));

  if (visibleEvents.length === 0) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none top-[var(--event-banner-top,80px)]">
      <div className="flex flex-col gap-1 items-center">
        <AnimatePresence mode="popLayout">
          {visibleEvents.map((event, index) => (
            <motion.div
              key={event.id}
              layout
              initial={{ y: -30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ 
                y: -30, 
                opacity: 0, 
                scale: 0.9,
                transition: { duration: 0.2 }
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 30,
                delay: index * 0.08,
              }}
              className="pointer-events-auto"
            >
              <div 
                className={`
                  relative overflow-hidden backdrop-blur-xl rounded-full shadow-md
                  border border-white/15
                  ${event.event_type === 'steal' 
                    ? 'bg-gradient-to-r from-red-600/90 via-orange-500/90 to-red-600/90' 
                    : 'bg-gradient-to-r from-emerald-600/90 via-teal-500/90 to-emerald-600/90'}
                `}
              >
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: 'linear',
                    repeatDelay: 2 
                  }}
                />

                {/* Content */}
                <div className="relative px-2.5 py-1 flex items-center gap-1.5">
                  {/* Icon with pulse */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: 'easeInOut' 
                    }}
                    className="flex-shrink-0"
                  >
                    {event.event_type === 'steal' ? (
                      <Target className="w-2.5 h-2.5 text-white drop-shadow-lg" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-white drop-shadow-lg" />
                    )}
                  </motion.div>
                  
                  {/* Text content */}
                  <span className="text-white text-[10px] font-semibold tracking-wide whitespace-nowrap">
                    {event.name}
                  </span>

                  {/* Action Button */}
                  <HuntButton event={event} />

                  {/* Close button */}
                  <motion.button
                    onClick={() => setDismissed(prev => [...prev, event.id])}
                    className="p-0.5 hover:bg-black/20 rounded-full transition-colors flex-shrink-0"
                    aria-label="Close"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <X className="w-2.5 h-2.5 text-white/80" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
