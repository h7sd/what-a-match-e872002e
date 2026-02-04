import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Target, Skull, Crosshair } from 'lucide-react';
import { useHuntBadgeHolder } from '@/hooks/useHuntBadgeHolder';

interface BadgeEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  is_active: boolean;
}

function EventRow({ event }: { event: BadgeEvent }) {
  const isHunt = event.event_type === 'hunt';
  const { data: holder, isLoading } = useHuntBadgeHolder(event.id);

  const action = (() => {
    if (!isHunt) {
      return (
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border border-border/60 bg-background/40 hover:bg-background/60 transition"
        >
          <Skull className="w-3 h-3" />
          Steal
        </Link>
      );
    }

    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border border-border/60 bg-background/30 text-muted-foreground">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-flex"
          >
            <Crosshair className="w-3 h-3" />
          </motion.span>
          Loading
        </span>
      );
    }

    if (!holder?.username) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border border-border/60 bg-background/30 text-muted-foreground">
          <Crosshair className="w-3 h-3" />
          No holder
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          // hard navigation to avoid caching issues
          window.location.href = `/${holder.username}`;
        }}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border border-border/60 bg-primary/15 hover:bg-primary/25 transition text-foreground"
      >
        <Crosshair className="w-3 h-3" />
        Hunt @{holder.username}
      </button>
    );
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg border border-border/50 bg-background/40 flex items-center justify-center flex-shrink-0">
          {isHunt ? (
            <Sparkles className="w-4 h-4 text-primary" />
          ) : (
            <Target className="w-4 h-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">{event.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {isHunt ? 'Find the hidden badge.' : 'Steal badges from other users.'}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">{action}</div>
    </motion.div>
  );
}

export function LandingEventsPopover() {
  const { data: activeEvents = [], isLoading } = useQuery({
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
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Active events</div>
        <div className="text-[11px] text-muted-foreground">
          {isLoading ? 'Updating…' : `${activeEvents.length} live`}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {activeEvents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-border/50 bg-background/30 p-3 text-sm text-muted-foreground"
          >
            No events active right now.
          </motion.div>
        ) : (
          activeEvents.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </AnimatePresence>
    </div>
  );
}
