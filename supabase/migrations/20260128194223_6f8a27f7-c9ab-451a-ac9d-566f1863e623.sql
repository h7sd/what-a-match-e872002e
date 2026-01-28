-- Add unique constraint to prevent duplicate views from same IP within a time window
-- First, create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_views_lookup 
ON public.profile_views (profile_id, viewer_ip_hash, viewed_at);

-- Create a function to check if a view is allowed (rate limiting)
CREATE OR REPLACE FUNCTION public.can_record_view(p_profile_id uuid, p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_view_time timestamp with time zone;
BEGIN
  -- Check if this IP has viewed this profile in the last 30 minutes
  SELECT viewed_at INTO last_view_time
  FROM public.profile_views
  WHERE profile_id = p_profile_id 
    AND viewer_ip_hash = p_ip_hash
  ORDER BY viewed_at DESC
  LIMIT 1;
  
  -- Allow if no previous view or last view was more than 30 minutes ago
  IF last_view_time IS NULL OR last_view_time < (now() - interval '30 minutes') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update RLS policy to be more restrictive
-- Only allow inserts that pass the rate limit check
DROP POLICY IF EXISTS "Anyone can create profile views" ON public.profile_views;

CREATE POLICY "Rate limited profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (
  -- Either no IP hash (legacy) or passes rate limit
  viewer_ip_hash IS NULL 
  OR public.can_record_view(profile_id, viewer_ip_hash)
);