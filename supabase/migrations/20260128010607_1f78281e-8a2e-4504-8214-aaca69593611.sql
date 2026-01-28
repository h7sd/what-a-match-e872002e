-- Add ASCII 3D settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ascii_size integer DEFAULT 8,
ADD COLUMN IF NOT EXISTS ascii_waves boolean DEFAULT true;