-- Add is_enabled column to user_badges for badge activation/deactivation
ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;

-- Update RLS policy to allow users to update their own badge settings
CREATE POLICY "Users can update their own badge settings"
ON public.user_badges
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);