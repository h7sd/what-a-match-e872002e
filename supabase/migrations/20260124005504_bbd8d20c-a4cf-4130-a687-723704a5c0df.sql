-- Create profiles table (using auth.users directly, no separate users table needed)
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    background_url TEXT,
    background_color TEXT DEFAULT '#0a0a0a',
    accent_color TEXT DEFAULT '#8b5cf6',
    card_color TEXT DEFAULT 'rgba(0,0,0,0.5)',
    effects_config JSONB DEFAULT '{"sparkles": false, "tilt": true, "glow": false, "typewriter": false}'::jsonb,
    music_url TEXT,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social links table
CREATE TABLE public.social_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spotify integrations table
CREATE TABLE public.spotify_integrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    show_on_profile BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discord integrations table
CREATE TABLE public.discord_integrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    discord_id TEXT,
    username TEXT,
    discriminator TEXT,
    avatar TEXT,
    show_on_profile BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile views table for analytics
CREATE TABLE public.profile_views (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewer_ip_hash TEXT,
    viewer_country TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_social_links_profile ON public.social_links(profile_id);
CREATE INDEX idx_badges_profile ON public.badges(profile_id);
CREATE INDEX idx_profile_views_profile ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_date ON public.profile_views(viewed_at);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user owns the profile
CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = profile_id AND user_id = auth.uid()
  )
$$;

-- RLS Policies for profiles (public read, owner write)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for social_links
CREATE POLICY "Social links are viewable by everyone"
ON public.social_links FOR SELECT
USING (true);

CREATE POLICY "Users can create social links for their profile"
ON public.social_links FOR INSERT
WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Users can update their own social links"
ON public.social_links FOR UPDATE
USING (public.is_profile_owner(profile_id));

CREATE POLICY "Users can delete their own social links"
ON public.social_links FOR DELETE
USING (public.is_profile_owner(profile_id));

-- RLS Policies for badges
CREATE POLICY "Badges are viewable by everyone"
ON public.badges FOR SELECT
USING (true);

CREATE POLICY "Users can create badges for their profile"
ON public.badges FOR INSERT
WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Users can update their own badges"
ON public.badges FOR UPDATE
USING (public.is_profile_owner(profile_id));

CREATE POLICY "Users can delete their own badges"
ON public.badges FOR DELETE
USING (public.is_profile_owner(profile_id));

-- RLS Policies for spotify_integrations (owner only)
CREATE POLICY "Users can view their own spotify integration"
ON public.spotify_integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their spotify integration"
ON public.spotify_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their spotify integration"
ON public.spotify_integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their spotify integration"
ON public.spotify_integrations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for discord_integrations (owner only)
CREATE POLICY "Users can view their own discord integration"
ON public.discord_integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their discord integration"
ON public.discord_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their discord integration"
ON public.discord_integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their discord integration"
ON public.discord_integrations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for profile_views (public insert, owner read)
CREATE POLICY "Anyone can create profile views"
ON public.profile_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Profile owners can view their analytics"
ON public.profile_views FOR SELECT
USING (public.is_profile_owner(profile_id));

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spotify_integrations_updated_at
BEFORE UPDATE ON public.spotify_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discord_integrations_updated_at
BEFORE UPDATE ON public.discord_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_profile_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles 
    SET views_count = views_count + 1 
    WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER increment_views_on_insert
AFTER INSERT ON public.profile_views
FOR EACH ROW EXECUTE FUNCTION public.increment_profile_views();