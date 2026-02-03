-- Add show_likes column to profiles for toggling like buttons visibility
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_likes boolean DEFAULT true;

-- Create profile_comments table for encrypted comments
CREATE TABLE IF NOT EXISTS public.profile_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commenter_ip_hash text NOT NULL,
  commenter_user_id uuid NULL,
  encrypted_content text NOT NULL,
  encrypted_metadata text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  is_read boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;

-- No direct access policies - all operations go through edge function
CREATE POLICY "No direct access to profile_comments"
  ON public.profile_comments
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profile_comments_profile_id ON public.profile_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_comments_expires_at ON public.profile_comments(expires_at);

-- Function to cleanup expired comments
CREATE OR REPLACE FUNCTION public.cleanup_expired_comments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profile_comments WHERE expires_at < now();
END;
$$;

-- RPC function to get comment count for profile owner (via service role only)
CREATE OR REPLACE FUNCTION public.get_profile_comments_count(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO comment_count
  FROM public.profile_comments
  WHERE profile_id = p_profile_id
    AND expires_at > now();
  
  RETURN comment_count;
END;
$$;