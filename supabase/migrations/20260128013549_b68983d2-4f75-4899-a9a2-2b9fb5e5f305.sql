-- Add icon_only_links setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS icon_only_links boolean DEFAULT false;