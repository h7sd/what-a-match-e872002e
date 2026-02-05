import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_logins: number;
  is_new_day: boolean;
  streak_increased: boolean;
}

interface StreakRecord {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  total_logins: number;
  created_at: string;
  updated_at: string;
}

export function useStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [streakUpdated, setStreakUpdated] = useState(false);

  // Fetch current streak data
  const { data: streak, isLoading } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching streak:', error);
        return null;
      }
      
      return data as StreakRecord | null;
    },
    enabled: !!user?.id,
  });

  // Mutation to update streak on login
  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('update_user_streak', {
        p_user_id: user.id,
      });
      if (error) throw error;
      return data as unknown as StreakData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-streak', user?.id] });
      if (data?.is_new_day) {
        setStreakUpdated(true);
        setTimeout(() => setStreakUpdated(false), 5000);
      }
    },
  });

  // Auto-update streak on mount/login
  useEffect(() => {
    if (user?.id && !updateStreakMutation.isPending) {
      updateStreakMutation.mutate();
    }
  }, [user?.id]);

  return {
    streak,
    isLoading,
    streakUpdated,
    updateStreak: updateStreakMutation.mutate,
  };
}

// Milestone definitions for streak rewards
export const STREAK_MILESTONES = [
  { days: 3, label: '3 Days', icon: '🔥', color: '#f97316' },
  { days: 7, label: '1 Week', icon: '⭐', color: '#eab308' },
  { days: 14, label: '2 Weeks', icon: '💎', color: '#06b6d4' },
  { days: 30, label: '1 Month', icon: '👑', color: '#a855f7' },
  { days: 60, label: '2 Months', icon: '🏆', color: '#ec4899' },
  { days: 100, label: '100 Days', icon: '💯', color: '#ef4444' },
  { days: 365, label: '1 Year', icon: '🎖️', color: '#22c55e' },
];

export function getNextMilestone(currentStreak: number) {
  return STREAK_MILESTONES.find(m => m.days > currentStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

export function getCurrentMilestone(currentStreak: number) {
  const achieved = STREAK_MILESTONES.filter(m => m.days <= currentStreak);
  return achieved[achieved.length - 1] || null;
}
