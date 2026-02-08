import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-proxy-client';

interface HuntEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  is_active: boolean;
  steal_duration_hours: number;
  target_badge_id: string | null;
}

export function useActiveHuntEvent() {
  return useQuery({
    queryKey: ['activeHuntEvent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_events')
        .select('*')
        .eq('is_active', true)
        .eq('event_type', 'hunt')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as HuntEvent | null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
