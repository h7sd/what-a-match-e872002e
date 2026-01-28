import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  background_url: string | null;
  background_color: string | null;
  accent_color: string | null;
  card_color: string | null;
  effects_config: {
    sparkles?: boolean;
    tilt?: boolean;
    glow?: boolean;
    typewriter?: boolean;
  } | null;
  music_url: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  id: string;
  profile_id: string;
  platform: string;
  url: string;
  title: string | null;
  icon: string | null;
  description: string | null;
  style: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color: string | null;
  created_at: string;
}

export function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!username,
  });
}

export function useCurrentUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', 'current', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}

export function useSocialLinks(profileId: string) {
  return useQuery({
    queryKey: ['social-links', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profileId)
        .eq('is_visible', true)
        .order('display_order');

      if (error) throw error;
      return data as SocialLink[];
    },
    enabled: !!profileId,
  });
}

export function useBadges(profileId: string) {
  return useQuery({
    queryKey: ['badges', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('profile_id', profileId);

      if (error) throw error;
      return data as Badge[];
    },
    enabled: !!profileId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCreateSocialLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: Omit<SocialLink, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('social_links')
        .insert(link)
        .select()
        .single();

      if (error) throw error;
      return data as SocialLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-links', data.profile_id] });
    },
  });
}

export function useUpdateSocialLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialLink> & { id: string }) => {
      const { data, error } = await supabase
        .from('social_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SocialLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-links', data.profile_id] });
    },
  });
}

export function useDeleteSocialLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, profileId }: { id: string; profileId: string }) => {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, profileId };
    },
    onSuccess: ({ profileId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-links', profileId] });
    },
  });
}

// Session-based view tracking to prevent refresh spam (client-side layer)
const VIEW_SESSION_KEY = 'profile_views_session';

function getViewedProfiles(): Record<string, number> {
  try {
    const data = sessionStorage.getItem(VIEW_SESSION_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function markProfileViewed(profileId: string): void {
  try {
    const viewed = getViewedProfiles();
    viewed[profileId] = Date.now();
    sessionStorage.setItem(VIEW_SESSION_KEY, JSON.stringify(viewed));
  } catch {
    // Ignore storage errors
  }
}

function hasViewedRecently(profileId: string): boolean {
  const viewed = getViewedProfiles();
  const lastViewed = viewed[profileId];
  if (!lastViewed) return false;
  
  // Consider "recent" as within the last 30 minutes
  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() - lastViewed < thirtyMinutes;
}

export function useRecordProfileView() {
  return useMutation({
    mutationFn: async (profileId: string) => {
      // Client-side check first (reduces unnecessary server calls)
      if (hasViewedRecently(profileId)) {
        return; // Skip duplicate view
      }

      // Use edge function for server-side IP-based rate limiting
      try {
        const response = await supabase.functions.invoke('record-view', {
          body: { profile_id: profileId }
        });
        
        if (response.error) {
          console.error('Error recording view:', response.error);
        }
        
        // Mark as viewed in session regardless of server response
        markProfileViewed(profileId);
      } catch (error) {
        console.error('Error calling record-view function:', error);
        // Still mark as viewed to prevent spam attempts
        markProfileViewed(profileId);
      }
    },
  });
}
