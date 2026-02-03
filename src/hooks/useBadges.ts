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
  user_id?: string; // Optional - not included in public queries for privacy
  badge_id: string;
  claimed_at: string;
  is_enabled: boolean;
  is_locked?: boolean;
  badge?: GlobalBadge;
}

// Check if user is admin - SECURITY: This is for UI display only!
// Actual permissions are enforced by RLS policies in the database.
// Even if this check is bypassed client-side, database operations will still fail.
export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Double-check: verify the JWT is valid first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.user || sessionData.session.user.id !== user.id) {
        console.error('Session validation failed');
        return false;
      }
      
      // Use RPC which validates against the actual database
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      // Strict boolean check - anything other than explicit true is false
      return data === true;
    },
    enabled: !!user?.id,
    // Don't cache for too long to prevent stale admin status
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// Get all global badges (uses secure RPC to hide created_by from non-admins)
export function useGlobalBadges() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  
  return useQuery({
    queryKey: ['globalBadges', user?.id, isAdmin],
    queryFn: async () => {
      // SECURITY: Always use RPC for public access to hide created_by
      // Only admins get full data, and we wait for admin check to complete
      if (isAdmin === true) {
        // Admins can see full data including created_by
        const { data, error } = await supabase
          .from('global_badges')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as GlobalBadge[];
      } else {
        // Public users use secure RPC that hides created_by
        const { data, error } = await supabase.rpc('get_public_badges');
        
        if (error) throw error;
        return (data || []) as GlobalBadge[];
      }
    },
    // Wait until admin check is complete before fetching
    enabled: !isAdminLoading,
  });
}

// Get user's claimed badges (for own dashboard - protected by RLS)
export function useUserBadges(userId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['userBadges', userId],
    queryFn: async () => {
      // SECURITY: Only allow fetching own badges
      if (!user || user.id !== userId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge_id,
          claimed_at,
          is_enabled,
          is_locked,
          badge:global_badges(
            id,
            name,
            description,
            icon_url,
            color,
            rarity,
            is_limited,
            max_claims,
            claims_count,
            created_at
          )
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as (UserBadge & { badge: GlobalBadge })[];
    },
    enabled: !!userId && !!user && user.id === userId,
  });
}

// Get badges for a profile (only enabled ones)
// Uses a secure database function that doesn't expose user_id
export function useProfileBadges(profileId: string) {
  return useQuery({
    queryKey: ['profileBadges', profileId],
    queryFn: async () => {
      // Use secure RPC function that joins internally without exposing user_id
      const { data, error } = await supabase
        .rpc('get_profile_badges', { p_profile_id: profileId });
      
      if (error) throw error;
      return (data || []) as GlobalBadge[];
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

      // claims_count is handled by a backend trigger to keep it atomic + consistent.
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
