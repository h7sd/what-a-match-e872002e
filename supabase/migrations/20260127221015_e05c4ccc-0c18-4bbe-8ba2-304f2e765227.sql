-- Add column to control visibility of views on profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_views boolean DEFAULT true;