-- Add alias_changed_at column to track when alias was last changed
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS alias_changed_at TIMESTAMP WITH TIME ZONE;