-- Add explicit deny policy for anonymous users on profiles table (defense in depth)
-- This ensures that even if other policies are misconfigured, anon users cannot access profiles directly
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- Also add explicit deny for anon on banned_users (already admin-only, but defense in depth)
DROP POLICY IF EXISTS "Deny anonymous access to banned_users" ON public.banned_users;
CREATE POLICY "Deny anonymous access to banned_users" 
ON public.banned_users 
FOR ALL 
TO anon
USING (false);