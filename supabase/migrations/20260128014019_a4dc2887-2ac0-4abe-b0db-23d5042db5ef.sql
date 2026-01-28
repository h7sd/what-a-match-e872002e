-- Add icon links opacity setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS icon_links_opacity integer DEFAULT 100;