import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * Checks if the current user has already stolen a badge in the active steal event.
 * Returns true if they already stole (so we hide the target icons).
 * For HUNT events, always returns false (no limit on hunts).
 */
export function useHasStolenInEvent(activeEventId: string | null | undefined, eventType?: 'steal' | 'hunt' | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-stolen-in-event', user?.id, activeEventId, eventType],
    queryFn: async () => {
      if (!user || !activeEventId) return false;
      
      // Hunt events have no limit - always allow hunting
      if (eventType === 'hunt') return false;

      const { data, error } = await supabase
        .from('badge_steals')
        .select('id')
        .eq('thief_user_id', user.id)
        .eq('event_id', activeEventId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking steal status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user && !!activeEventId,
    staleTime: 10_000, // 10 seconds
  });
}
