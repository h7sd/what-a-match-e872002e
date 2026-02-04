import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, X } from 'lucide-react';
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
        className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors"
      >
        🏴‍☠️ Steal
      </Link>
    );
  }
  
  // Hunt event - link to current holder's profile
  if (isLoading) {
    return (
      <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold opacity-50">
        🎯 Loading...
      </span>
    );
  }
  
  if (!holder?.username) {
    return (
      <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold opacity-50">
        🎯 No holder
      </span>
    );
  }
  
  // Force page reload when navigating to hunt target to ensure fresh data
  const handleHuntClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate with state to force refetch
    window.location.href = `/${holder.username}`;
  };
  
  return (
    <button 
      onClick={handleHuntClick}
      className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors animate-pulse cursor-pointer"
    >
      🎯 Hunt @{holder.username}
    </button>
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const visibleEvents = activeEvents.filter(e => !dismissed.includes(e.id));

  if (visibleEvents.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex flex-col">
      <AnimatePresence>
        {visibleEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
            className="pointer-events-auto"
          >
            <div 
              className={`
                w-full py-2 px-4 flex items-center justify-center gap-2 text-white font-medium text-sm
                ${event.event_type === 'steal' 
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600' 
                  : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600'}
              `}
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            >
              {event.event_type === 'steal' ? (
                <Target className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 flex-shrink-0" />
              )}
              
              <span className="truncate">
                <strong>{event.name}</strong>
                <span className="hidden sm:inline">
                  {' - '}
                  {event.event_type === 'steal' 
                    ? 'Steal badges from other users!' 
                    : 'Find the hidden badge!'}
                </span>
              </span>

              <HuntButton event={event} />

              <button
                onClick={() => setDismissed(prev => [...prev, event.id])}
                className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
