import { supabase } from '@/integrations/supabase/client';

// Secure API layer that proxies all public requests through edge function
// This prevents direct database queries from being visible in dev tools

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function callApi<T>(action: string, params?: Record<string, any>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('api-proxy', {
      body: { action, params }
    });

    if (error) {
      console.error('API call failed');
      return null;
    }

    if (data?.error) {
      console.error('API returned error');
      return null;
    }

    return data?.data as T;
  } catch (err) {
    console.error('API request failed');
    return null;
  }
}

// Stats
export interface PublicStats {
  totalViews: number;
  totalUsers: number;
}

export async function getPublicStats(): Promise<PublicStats> {
  const result = await callApi<PublicStats>('get_stats');
  return result || { totalViews: 0, totalUsers: 0 };
}

export async function getHeroAvatars(): Promise<string[]> {
  const result = await callApi<string[]>('get_hero_avatars');
  return Array.isArray(result) ? result : [];
}

// Featured profiles (for sidebar)
export interface FeaturedProfile {
  u: string; // username
  d: string | null; // display_name
  n: number; // uid_number
}

export async function getFeaturedProfiles(limit = 50): Promise<FeaturedProfile[]> {
  const result = await callApi<FeaturedProfile[]>('get_featured_profiles', { limit });
  return result || [];
}

// Featured profiles with full data (for card swap - single request)
export interface FeaturedProfileFull {
  profile: PublicProfile;
  badges: PublicBadge[];
}

export async function getFeaturedProfilesFull(limit = 15): Promise<FeaturedProfileFull[]> {
  const result = await callApi<FeaturedProfileFull[]>('get_featured_profiles_full', { limit });
  return result || [];
}

// Public profile data
export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  background_url: string | null;
  background_color: string | null;
  accent_color: string | null;
  card_color: string | null;
  effects_config: any;
  music_url: string | null;
  views_count: number;
  uid_number: number;
  created_at: string;
  updated_at: string;
  background_video_url: string | null;
  avatar_shape: string | null;
  name_font: string | null;
  text_font: string | null;
  occupation: string | null;
  location: string | null;
  discord_user_id: string | null;
  layout_style: string | null;
  card_style: string | null;
  text_color: string | null;
  icon_color: string | null;
  custom_cursor_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_icon_url: string | null;
  og_title_animation: string | null;
  background_effect: string | null;
  discord_card_style: string | null;
  discord_badge_color: string | null;
  discord_card_opacity: number | null;
  discord_show_badge: boolean | null;
  discord_avatar_decoration: boolean | null;
  use_discord_avatar: boolean | null;
  start_screen_enabled: boolean | null;
  start_screen_text: string | null;
  start_screen_font: string | null;
  start_screen_color: string | null;
  start_screen_bg_color: string | null;
  start_screen_animation: string | null;
  show_volume_control: boolean | null;
  show_username: boolean | null;
  show_badges: boolean | null;
  show_views: boolean | null;
  show_avatar: boolean | null;
  show_links: boolean | null;
  show_description: boolean | null;
  show_display_name: boolean | null;
  card_border_enabled: boolean | null;
  card_border_width: number | null;
  card_border_color: string | null;
  audio_volume: number | null;
  profile_opacity: number | null;
  profile_blur: number | null;
  monochrome_icons: boolean | null;
  animated_title: boolean | null;
  swap_bio_colors: boolean | null;
  glow_username: boolean | null;
  glow_socials: boolean | null;
  glow_badges: boolean | null;
  enable_profile_gradient: boolean | null;
  icon_only_links: boolean | null;
  icon_links_opacity: number | null;
  transparent_badges: boolean | null;
  ascii_size: number | null;
  ascii_waves: boolean | null;
  is_premium: boolean | null;
  display_name_animation: string | null;
  likes_count: number | null;
  dislikes_count: number | null;
  show_likes: boolean | null;
  use_global_badge_color: boolean | null;
  global_badge_color: string | null;
  og_embed_color: string | null;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  return callApi<PublicProfile>('get_public_profile', { username });
}

export async function getPublicProfileByAlias(alias: string): Promise<PublicProfile | null> {
  return callApi<PublicProfile>('get_public_profile', { alias });
}

// Profile links
export interface PublicLink {
  platform: string;
  url: string;
  title: string | null;
  icon: string | null;
  description: string | null;
  style: string | null;
  display_order: number;
  is_visible: boolean;
}

export async function getProfileLinks(username: string): Promise<PublicLink[]> {
  const result = await callApi<PublicLink[]>('get_profile_links', { username });
  return result || [];
}

// Profile badges
export interface PublicBadge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color: string | null;
  rarity: string | null;
  badge_type?: string | null; // 'global', 'friend', 'stolen'
  display_order?: number | null;
  custom_color?: string | null;
}

export async function getProfileBadges(username: string): Promise<PublicBadge[]> {
  const result = await callApi<PublicBadge[]>('get_profile_badges', { username });
  return result || [];
}

// Search
export interface SearchResult {
  u: string; // username
  d: string | null; // display_name  
  a: string | null; // avatar_url
}

export async function searchProfiles(query: string, limit = 10): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  const result = await callApi<SearchResult[]>('search_profiles', { query, limit });
  return result || [];
}

// Global badges
export async function getGlobalBadges(): Promise<PublicBadge[]> {
  const result = await callApi<PublicBadge[]>('get_global_badges');
  return result || [];
}

// Username/alias availability
export async function checkUsernameExists(username: string): Promise<boolean> {
  const result = await callApi<{ exists: boolean }>('check_username', { username });
  // Fail-closed for security: if the backend check fails, treat as taken
  // to avoid leaking availability via errors or mis-reporting.
  if (!result) return true;
  return !!result.exists;
}

export async function checkAliasExists(alias: string): Promise<boolean> {
  const result = await callApi<{ exists: boolean }>('check_alias', { alias });
  // Fail-closed for security: if the backend check fails, treat as taken
  if (!result) return true;
  return !!result.exists;
}
