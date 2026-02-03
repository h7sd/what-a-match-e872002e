-- ============================================
-- SECURITY FIX 1: Badge Icons Storage - Admin Only
-- ============================================

-- Drop existing vulnerable policies
DROP POLICY IF EXISTS "Users can upload badge icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can update badge icons" ON storage.objects;

-- Create admin-only policy for badge icons
CREATE POLICY "Admins can manage badge icons"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'profile-assets' 
  AND name LIKE 'badge-icons/%' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'profile-assets' 
  AND name LIKE 'badge-icons/%' 
  AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- SECURITY FIX 2: Discord Presence - Restrict Public Access
-- ============================================

-- Drop the vulnerable public access policy
DROP POLICY IF EXISTS "Discord presence is viewable by everyone" ON public.discord_presence;

-- Create restricted policy - only profile owner or via RPC function
CREATE POLICY "Users can view their own discord presence"
ON public.discord_presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = discord_presence.profile_id
    AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Update the get_public_profile RPC to include discord presence data
-- (This is already handled separately, no changes needed to RPC)

-- ============================================
-- SECURITY FIX 3: Spotify Tokens - Hide Sensitive Data
-- ============================================

-- Create a secure view that excludes tokens
CREATE OR REPLACE VIEW public.spotify_integrations_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  show_on_profile,
  created_at,
  updated_at
  -- Explicitly excludes: access_token, refresh_token, expires_at
FROM public.spotify_integrations;

-- Update RLS on base table to be more restrictive
-- Users can only see their own records (tokens included for their own use)
-- The existing policies already restrict this, but let's ensure it

-- ============================================
-- SECURITY FIX 4: Create secure RPC for Discord Presence on profiles
-- ============================================

CREATE OR REPLACE FUNCTION public.get_profile_discord_presence(p_profile_id uuid)
RETURNS TABLE(
  status text,
  activity_name text,
  activity_type text,
  activity_state text,
  activity_details text,
  activity_large_image text,
  username text,
  avatar text,
  discord_user_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dp.status,
    dp.activity_name,
    dp.activity_type,
    dp.activity_state,
    dp.activity_details,
    dp.activity_large_image,
    dp.username,
    dp.avatar,
    dp.discord_user_id
  FROM discord_presence dp
  WHERE dp.profile_id = p_profile_id;
$$;