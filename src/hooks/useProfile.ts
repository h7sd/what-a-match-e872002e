import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Profile {
  id: string;
  user_id?: string; // Optional - not included in public queries for privacy
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
  uid_number: number;
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
  click_count?: number;
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

// Public profile fields - excludes sensitive data like user_id
const PUBLIC_PROFILE_FIELDS = `
  id,
  username,
  display_name,
  bio,
  avatar_url,
  background_url,
  background_color,
  accent_color,
  card_color,
  effects_config,
  music_url,
  views_count,
  uid_number,
  created_at,
  updated_at,
  background_video_url,
  avatar_shape,
  name_font,
  text_font,
  occupation,
  location,
  discord_user_id,
  layout_style,
  card_style,
  text_color,
  icon_color,
  custom_cursor_url,
  og_title,
  og_description,
  og_image_url,
  og_icon_url,
  og_title_animation,
  background_effect,
  discord_card_style,
  discord_badge_color,
  discord_card_opacity,
  discord_show_badge,
  discord_avatar_decoration,
  use_discord_avatar,
  start_screen_enabled,
  start_screen_text,
  start_screen_font,
  start_screen_color,
  start_screen_bg_color,
  start_screen_animation,
  show_volume_control,
  show_username,
  show_badges,
  show_views,
  show_avatar,
  show_links,
  show_description,
  show_display_name,
  card_border_enabled,
  card_border_width,
  card_border_color,
  audio_volume,
  profile_opacity,
  profile_blur,
  monochrome_icons,
  animated_title,
  swap_bio_colors,
  glow_username,
  glow_socials,
  glow_badges,
  enable_profile_gradient,
  icon_only_links,
  icon_links_opacity,
  transparent_badges,
  ascii_size,
  ascii_waves,
  is_premium
`;

export function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      // Use SECURITY DEFINER function for public profile access
      // This ensures sensitive fields (paypal_order_id, etc.) are never exposed
      const { data, error } = await supabase
        .rpc('get_public_profile', { p_username: username.toLowerCase() });

      if (error) throw error;
      // RPC returns an array, get first result
      const profile = Array.isArray(data) ? data[0] : data;
      return profile as Profile | null;
    },
    enabled: !!username,
  });
}

export function useProfileByAlias(alias: string) {
  return useQuery({
    queryKey: ['profile-alias', alias],
    queryFn: async () => {
      // Use SECURITY DEFINER function for public profile access
      const { data, error } = await supabase
        .rpc('get_public_profile_by_alias', { p_alias: alias.toLowerCase() });

      if (error) throw error;
      // RPC returns an array, get first result
      const profile = Array.isArray(data) ? data[0] : data;
      return profile as Profile | null;
    },
    enabled: !!alias,
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
        .maybeSingle();

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
