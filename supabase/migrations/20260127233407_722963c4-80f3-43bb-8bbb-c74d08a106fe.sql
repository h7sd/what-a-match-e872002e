-- Add new profile visibility columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_links BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_description BOOLEAN DEFAULT true;