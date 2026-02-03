-- ============================================================
-- HARDEN: profiles table - strict owner + admin access only
-- ============================================================

-- The previous migration partially succeeded - clean up if needed
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Add explicit authentication requirement as RESTRICTIVE policy
-- Correct syntax: AS RESTRICTIVE comes before FOR
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Verify RLS is enabled
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;