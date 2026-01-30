-- Add Open Graph customization columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS og_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_icon_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_title_animation TEXT DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.og_title IS 'Custom Open Graph title for Discord/Twitter embeds';
COMMENT ON COLUMN public.profiles.og_description IS 'Custom Open Graph description for Discord/Twitter embeds';
COMMENT ON COLUMN public.profiles.og_image_url IS 'Custom Open Graph image URL for Discord/Twitter embeds';
COMMENT ON COLUMN public.profiles.og_icon_url IS 'Custom Open Graph icon/favicon URL for Discord/Twitter embeds';
COMMENT ON COLUMN public.profiles.og_title_animation IS 'Animation style for OG title: none, typewriter, shuffle, decrypted';