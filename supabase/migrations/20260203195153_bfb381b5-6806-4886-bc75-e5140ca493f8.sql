-- Add display name animation field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name_animation text DEFAULT 'none';

-- Create profile_likes table for encrypted like/dislike system
CREATE TABLE public.profile_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liker_ip_hash TEXT NOT NULL, -- Hashed IP for anonymous likes
  liker_user_id UUID, -- Optional: if user is logged in
  is_like BOOLEAN NOT NULL DEFAULT true, -- true = like, false = dislike
  encrypted_data TEXT, -- Optional encrypted metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, liker_ip_hash) -- One vote per IP per profile
);

-- Add indexes for performance
CREATE INDEX idx_profile_likes_profile_id ON public.profile_likes(profile_id);
CREATE INDEX idx_profile_likes_liker_ip_hash ON public.profile_likes(liker_ip_hash);

-- Add like/dislike counts to profiles for quick access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on profile_likes
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_likes
-- Only allow reading aggregate counts via RPC functions, not direct access
CREATE POLICY "No direct read access to profile_likes" 
ON public.profile_likes 
FOR SELECT 
USING (false); -- No direct read - use RPC functions instead

-- Allow inserts/updates only through edge functions (service role)
CREATE POLICY "No direct insert to profile_likes" 
ON public.profile_likes 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No direct update to profile_likes" 
ON public.profile_likes 
FOR UPDATE 
USING (false);

CREATE POLICY "No direct delete to profile_likes" 
ON public.profile_likes 
FOR DELETE 
USING (false);

-- Create trigger to update like/dislike counts
CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_like THEN
      UPDATE public.profiles SET likes_count = likes_count + 1, updated_at = now() WHERE id = NEW.profile_id;
    ELSE
      UPDATE public.profiles SET dislikes_count = dislikes_count + 1, updated_at = now() WHERE id = NEW.profile_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change
    IF OLD.is_like != NEW.is_like THEN
      IF NEW.is_like THEN
        -- Changed from dislike to like
        UPDATE public.profiles SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1, updated_at = now() WHERE id = NEW.profile_id;
      ELSE
        -- Changed from like to dislike
        UPDATE public.profiles SET likes_count = likes_count - 1, dislikes_count = dislikes_count + 1, updated_at = now() WHERE id = NEW.profile_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_like THEN
      UPDATE public.profiles SET likes_count = GREATEST(0, likes_count - 1), updated_at = now() WHERE id = OLD.profile_id;
    ELSE
      UPDATE public.profiles SET dislikes_count = GREATEST(0, dislikes_count - 1), updated_at = now() WHERE id = OLD.profile_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER profile_likes_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profile_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_like_counts();

-- Create RPC function to get like counts (public access)
CREATE OR REPLACE FUNCTION public.get_profile_like_counts(p_profile_id UUID)
RETURNS TABLE(likes_count INTEGER, dislikes_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT p.likes_count, p.dislikes_count
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update get_public_profile to include new fields
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  avatar_shape text,
  background_url text,
  background_video_url text,
  music_url text,
  background_color text,
  accent_color text,
  text_color text,
  icon_color text,
  custom_cursor_url text,
  layout_style text,
  card_style text,
  card_color text,
  name_font text,
  text_font text,
  effects_config jsonb,
  monochrome_icons boolean,
  animated_title boolean,
  swap_bio_colors boolean,
  glow_username boolean,
  glow_socials boolean,
  glow_badges boolean,
  icon_only_links boolean,
  icon_links_opacity integer,
  transparent_badges boolean,
  use_discord_avatar boolean,
  discord_avatar_decoration boolean,
  discord_user_id text,
  discord_card_style text,
  discord_card_opacity integer,
  discord_show_badge boolean,
  discord_badge_color text,
  enable_profile_gradient boolean,
  profile_opacity integer,
  profile_blur integer,
  background_effect text,
  audio_volume numeric,
  start_screen_enabled boolean,
  start_screen_text text,
  start_screen_font text,
  start_screen_color text,
  start_screen_bg_color text,
  start_screen_animation text,
  ascii_size integer,
  ascii_waves boolean,
  show_volume_control boolean,
  show_username boolean,
  show_display_name boolean,
  show_badges boolean,
  show_views boolean,
  show_avatar boolean,
  show_links boolean,
  show_description boolean,
  card_border_enabled boolean,
  card_border_color text,
  card_border_width integer,
  og_title text,
  og_description text,
  og_image_url text,
  og_icon_url text,
  og_title_animation text,
  views_count integer,
  uid_number integer,
  is_premium boolean,
  created_at timestamptz,
  updated_at timestamptz,
  location text,
  occupation text,
  display_name_animation text,
  likes_count integer,
  dislikes_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.avatar_shape,
    p.background_url,
    p.background_video_url,
    p.music_url,
    p.background_color,
    p.accent_color,
    p.text_color,
    p.icon_color,
    p.custom_cursor_url,
    p.layout_style,
    p.card_style,
    p.card_color,
    p.name_font,
    p.text_font,
    p.effects_config::jsonb,
    p.monochrome_icons,
    p.animated_title,
    p.swap_bio_colors,
    p.glow_username,
    p.glow_socials,
    p.glow_badges,
    p.icon_only_links,
    p.icon_links_opacity,
    p.transparent_badges,
    p.use_discord_avatar,
    p.discord_avatar_decoration,
    p.discord_user_id,
    p.discord_card_style,
    p.discord_card_opacity,
    p.discord_show_badge,
    p.discord_badge_color,
    p.enable_profile_gradient,
    p.profile_opacity,
    p.profile_blur,
    p.background_effect,
    p.audio_volume,
    p.start_screen_enabled,
    p.start_screen_text,
    p.start_screen_font,
    p.start_screen_color,
    p.start_screen_bg_color,
    p.start_screen_animation,
    p.ascii_size,
    p.ascii_waves,
    p.show_volume_control,
    p.show_username,
    p.show_display_name,
    p.show_badges,
    p.show_views,
    p.show_avatar,
    p.show_links,
    p.show_description,
    p.card_border_enabled,
    p.card_border_color,
    p.card_border_width,
    p.og_title,
    p.og_description,
    p.og_image_url,
    p.og_icon_url,
    p.og_title_animation,
    p.views_count,
    p.uid_number,
    p.is_premium,
    p.created_at,
    p.updated_at,
    p.location,
    p.occupation,
    p.display_name_animation,
    p.likes_count,
    p.dislikes_count
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update get_public_profile_by_alias
DROP FUNCTION IF EXISTS public.get_public_profile_by_alias(text);
CREATE OR REPLACE FUNCTION public.get_public_profile_by_alias(p_alias text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  avatar_shape text,
  background_url text,
  background_video_url text,
  music_url text,
  background_color text,
  accent_color text,
  text_color text,
  icon_color text,
  custom_cursor_url text,
  layout_style text,
  card_style text,
  card_color text,
  name_font text,
  text_font text,
  effects_config jsonb,
  monochrome_icons boolean,
  animated_title boolean,
  swap_bio_colors boolean,
  glow_username boolean,
  glow_socials boolean,
  glow_badges boolean,
  icon_only_links boolean,
  icon_links_opacity integer,
  transparent_badges boolean,
  use_discord_avatar boolean,
  discord_avatar_decoration boolean,
  discord_user_id text,
  discord_card_style text,
  discord_card_opacity integer,
  discord_show_badge boolean,
  discord_badge_color text,
  enable_profile_gradient boolean,
  profile_opacity integer,
  profile_blur integer,
  background_effect text,
  audio_volume numeric,
  start_screen_enabled boolean,
  start_screen_text text,
  start_screen_font text,
  start_screen_color text,
  start_screen_bg_color text,
  start_screen_animation text,
  ascii_size integer,
  ascii_waves boolean,
  show_volume_control boolean,
  show_username boolean,
  show_display_name boolean,
  show_badges boolean,
  show_views boolean,
  show_avatar boolean,
  show_links boolean,
  show_description boolean,
  card_border_enabled boolean,
  card_border_color text,
  card_border_width integer,
  og_title text,
  og_description text,
  og_image_url text,
  og_icon_url text,
  og_title_animation text,
  views_count integer,
  uid_number integer,
  is_premium boolean,
  created_at timestamptz,
  updated_at timestamptz,
  location text,
  occupation text,
  display_name_animation text,
  likes_count integer,
  dislikes_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.avatar_shape,
    p.background_url,
    p.background_video_url,
    p.music_url,
    p.background_color,
    p.accent_color,
    p.text_color,
    p.icon_color,
    p.custom_cursor_url,
    p.layout_style,
    p.card_style,
    p.card_color,
    p.name_font,
    p.text_font,
    p.effects_config::jsonb,
    p.monochrome_icons,
    p.animated_title,
    p.swap_bio_colors,
    p.glow_username,
    p.glow_socials,
    p.glow_badges,
    p.icon_only_links,
    p.icon_links_opacity,
    p.transparent_badges,
    p.use_discord_avatar,
    p.discord_avatar_decoration,
    p.discord_user_id,
    p.discord_card_style,
    p.discord_card_opacity,
    p.discord_show_badge,
    p.discord_badge_color,
    p.enable_profile_gradient,
    p.profile_opacity,
    p.profile_blur,
    p.background_effect,
    p.audio_volume,
    p.start_screen_enabled,
    p.start_screen_text,
    p.start_screen_font,
    p.start_screen_color,
    p.start_screen_bg_color,
    p.start_screen_animation,
    p.ascii_size,
    p.ascii_waves,
    p.show_volume_control,
    p.show_username,
    p.show_display_name,
    p.show_badges,
    p.show_views,
    p.show_avatar,
    p.show_links,
    p.show_description,
    p.card_border_enabled,
    p.card_border_color,
    p.card_border_width,
    p.og_title,
    p.og_description,
    p.og_image_url,
    p.og_icon_url,
    p.og_title_animation,
    p.views_count,
    p.uid_number,
    p.is_premium,
    p.created_at,
    p.updated_at,
    p.location,
    p.occupation,
    p.display_name_animation,
    p.likes_count,
    p.dislikes_count
  FROM public.profiles p
  WHERE LOWER(p.alias_username) = LOWER(p_alias);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;