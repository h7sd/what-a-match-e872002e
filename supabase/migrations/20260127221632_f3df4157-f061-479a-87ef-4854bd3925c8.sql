-- Add columns for card border customization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS card_border_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS card_border_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS card_border_width integer DEFAULT 1;