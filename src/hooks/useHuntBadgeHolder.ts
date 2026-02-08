import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-proxy-client';

interface HuntBadgeHolder {
  username: string;
  user_id: string;
}

export function useHuntBadgeHolder(eventId: string | undefined) {
  return useQuery({
    queryKey: ['huntBadgeHolder', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .rpc('get_hunt_badge_holder', { p_event_id: eventId });

      if (error) throw error;
      
      // RPC returns an array, get first result
      const holder = Array.isArray(data) ? data[0] : data;
      return holder as HuntBadgeHolder | null;
    },
    enabled: !!eventId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Refetch every 15 seconds to catch steals
  });
}
