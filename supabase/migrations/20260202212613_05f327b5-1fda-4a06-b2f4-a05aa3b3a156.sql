-- Drop the SECURITY DEFINER view (linter warning)
DROP VIEW IF EXISTS public.global_badges_public;

-- The RPC function get_public_badges() is the secure way to access badges publicly
-- It uses SECURITY DEFINER but that's intentional and safe for functions