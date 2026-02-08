import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-proxy-client';

interface BadgeEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  is_active: boolean;
  steal_duration_hours: number;
}

export function useActiveStealEvent() {
  return useQuery({
    queryKey: ['activeStealEvent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_events')
        .select('*')
        .eq('is_active', true)
        .eq('event_type', 'steal')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as BadgeEvent | null;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
