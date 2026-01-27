-- Add background_effect column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background_effect TEXT DEFAULT 'particles';

-- Add audio_volume column to profiles  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS audio_volume REAL DEFAULT 0.5;