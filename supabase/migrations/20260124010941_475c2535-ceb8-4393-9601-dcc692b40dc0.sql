-- Add video background and more customization options
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS background_video_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_shape TEXT DEFAULT 'circle',
ADD COLUMN IF NOT EXISTS name_font TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS text_font TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'stacked',
ADD COLUMN IF NOT EXISTS card_style TEXT DEFAULT 'classic';

-- Add more fields to social_links for better customization
ALTER TABLE public.social_links
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'card';

-- Create discord_presence table for caching Discord status
CREATE TABLE IF NOT EXISTS public.discord_presence (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    discord_user_id TEXT NOT NULL,
    username TEXT,
    avatar TEXT,
    status TEXT,
    activity_name TEXT,
    activity_type TEXT,
    activity_details TEXT,
    activity_state TEXT,
    activity_large_image TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_presence ENABLE ROW LEVEL SECURITY;

-- Everyone can view discord presence
CREATE POLICY "Discord presence is viewable by everyone"
ON public.discord_presence FOR SELECT
USING (true);

-- Only profile owners can manage their discord presence
CREATE POLICY "Users can manage their discord presence"
ON public.discord_presence FOR ALL
USING (public.is_profile_owner(profile_id));