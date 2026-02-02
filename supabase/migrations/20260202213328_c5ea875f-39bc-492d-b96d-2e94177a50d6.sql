-- First ensure RLS is enabled
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Admins can manage banned users" ON public.banned_users;
DROP POLICY IF EXISTS "Deny anonymous access to banned_users" ON public.banned_users;

-- Create a single PERMISSIVE policy for admin-only access
-- This is the correct approach - only admins can access, everyone else is denied
CREATE POLICY "Only admins can access banned_users"
ON public.banned_users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Explicitly deny anonymous access (anon role)
CREATE POLICY "Deny anon access to banned_users"
ON public.banned_users
FOR ALL
TO anon
USING (false)
WITH CHECK (false);