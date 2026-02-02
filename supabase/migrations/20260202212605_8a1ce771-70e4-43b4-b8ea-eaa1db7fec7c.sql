-- Fix 1: Remove public SELECT on user_badges - force access through secure RPC function
-- The get_profile_badges function already exists and doesn't expose user_id
DROP POLICY IF EXISTS "User badges are viewable by everyone" ON public.user_badges;

-- Create a restricted policy: only profile owners, admins, or via RPC can see badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Create a secure view for global_badges without created_by
CREATE OR REPLACE VIEW public.global_badges_public AS
SELECT 
  id,
  name,
  description,
  icon_url,
  color,
  rarity,
  is_limited,
  max_claims,
  claims_count,
  created_at
  -- created_by is intentionally excluded
FROM public.global_badges;

-- Grant access to the view
GRANT SELECT ON public.global_badges_public TO anon, authenticated;

-- Create a secure RPC function for public badge listing
CREATE OR REPLACE FUNCTION public.get_public_badges()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  color text,
  rarity text,
  is_limited boolean,
  max_claims integer,
  claims_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    description,
    icon_url,
    color,
    rarity,
    is_limited,
    max_claims,
    claims_count,
    created_at
  FROM public.global_badges
  ORDER BY created_at DESC;
$$;