import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Types
export interface GlobalBadge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color: string | null;
  rarity: string | null;
  is_limited: boolean | null;
  max_claims: number | null;
  claims_count: number | null;
  created_at: string;
  created_by: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  claimed_at: string;
  is_enabled: boolean;
  badge?: GlobalBadge;
}

// Check if user is admin
export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

// Get all global badges
export function useGlobalBadges() {
  return useQuery({
    queryKey: ['globalBadges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_badges')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GlobalBadge[];
    },
  });
}

// Get user's claimed badges
export function useUserBadges(userId: string) {
  return useQuery({
    queryKey: ['userBadges', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:global_badges(*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as (UserBadge & { badge: GlobalBadge })[];
    },
    enabled: !!userId,
  });
}

// Get badges for a profile (only enabled ones)
export function useProfileBadges(profileId: string) {
  return useQuery({
    queryKey: ['profileBadges', profileId],
    queryFn: async () => {
      // First get the user_id from the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      if (!profile) return [];

      // Then get the user's enabled badges only
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:global_badges(*)
        `)
        .eq('user_id', profile.user_id)
        .eq('is_enabled', true);
      
      if (error) throw error;
      return (data as (UserBadge & { badge: GlobalBadge })[]).map(ub => ub.badge);
    },
    enabled: !!profileId,
  });
}

// Create a global badge (admin only)
export function useCreateGlobalBadge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (badge: Omit<GlobalBadge, 'id' | 'created_at' | 'created_by' | 'claims_count'>) => {
      const { data, error } = await supabase
        .from('global_badges')
        .insert({
          ...badge,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalBadges'] });
    },
  });
}

// Update a global badge (admin only)
export function useUpdateGlobalBadge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GlobalBadge> & { id: string }) => {
      const { data, error } = await supabase
        .from('global_badges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalBadges'] });
    },
  });
}

// Delete a global badge (admin only)
export function useDeleteGlobalBadge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_badges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalBadges'] });
    },
  });
}

// Claim a badge for user
export function useClaimBadge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (badgeId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update claims count directly
      await supabase
        .from('global_badges')
        .update({ claims_count: supabase.rpc ? undefined : 0 })
        .eq('id', badgeId);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['globalBadges'] });
    },
  });
}

// Assign badge to user (admin only)
export function useAssignBadge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { data, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
    },
  });
}

// Remove badge from user (admin only)
export function useRemoveBadge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', userId)
        .eq('badge_id', badgeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
    },
  });
}
