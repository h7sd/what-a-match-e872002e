-- Add transparent_badges setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN transparent_badges boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.transparent_badges IS 'When true, badges are displayed without background';