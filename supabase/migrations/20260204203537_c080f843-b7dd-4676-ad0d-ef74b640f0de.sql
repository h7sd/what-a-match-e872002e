-- First, drop the restrictive policies that block anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Create a new policy that allows public read access to profiles for the landing page
CREATE POLICY "Public can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);