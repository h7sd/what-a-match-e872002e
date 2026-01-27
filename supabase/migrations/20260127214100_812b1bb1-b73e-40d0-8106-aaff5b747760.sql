-- Add start screen customization columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS start_screen_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS start_screen_text text DEFAULT 'Click anywhere to enter',
ADD COLUMN IF NOT EXISTS start_screen_font text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS start_screen_color text DEFAULT '#a855f7',
ADD COLUMN IF NOT EXISTS start_screen_bg_color text DEFAULT '#000000';