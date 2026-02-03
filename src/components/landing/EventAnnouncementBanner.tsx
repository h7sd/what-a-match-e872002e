import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface BadgeEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  is_active: boolean;
  steal_duration_hours: number;
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
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <AnimatePresence>
        {visibleEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ delay: index * 0.1 }}
            className="pointer-events-auto"
          >
            <div 
              className={`
                w-full py-3 px-4 flex items-center justify-center gap-3 text-white font-medium
                ${event.event_type === 'steal' 
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600'}
              `}
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            >
              {event.event_type === 'steal' ? (
                <Target className="w-5 h-5 animate-bounce" />
              ) : (
                <Sparkles className="w-5 h-5 animate-pulse" />
              )}
              
              <span className="text-sm md:text-base">
                <strong>{event.name}</strong>
                {' - '}
                {event.event_type === 'steal' 
                  ? 'Steal badges from other users!' 
                  : 'Find the hidden badge!'}
              </span>

              <Link 
                to="/" 
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors"
              >
                {event.event_type === 'steal' ? '🏴‍☠️ Steal' : '🎯 Hunt'}
              </Link>

              <button
                onClick={() => setDismissed(prev => [...prev, event.id])}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
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
