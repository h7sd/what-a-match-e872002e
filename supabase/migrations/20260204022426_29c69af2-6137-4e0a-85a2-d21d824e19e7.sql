-- Allow authenticated users to search for other profiles (for friend badges, etc.)
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);