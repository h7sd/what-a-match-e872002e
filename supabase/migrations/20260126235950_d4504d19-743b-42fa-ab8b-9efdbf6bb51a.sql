-- Create storage bucket for profile assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-assets', 'profile-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own profile assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own assets
CREATE POLICY "Users can update their own profile assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own assets
CREATE POLICY "Users can delete their own profile assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to profile assets
CREATE POLICY "Profile assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-assets');

-- Add additional profile customization columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS profile_opacity INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS profile_blur INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_cursor_url TEXT,
ADD COLUMN IF NOT EXISTS monochrome_icons BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS animated_title BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS swap_bio_colors BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_discord_avatar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discord_avatar_decoration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_profile_gradient BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_username BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_socials BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_badges BOOLEAN DEFAULT false;