-- Add is_locked column to user_badges table for admin badge locking
ALTER TABLE public.user_badges 
ADD COLUMN is_locked boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.user_badges.is_locked IS 'When true, the badge is locked by admin and user cannot enable it';