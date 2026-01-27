-- Add columns to control visibility of username and badges on profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_username boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_badges boolean DEFAULT true;