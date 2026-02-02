-- Allow authenticated users to view their own purchase history
CREATE POLICY "Users can view own purchases" 
ON public.purchases 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Explicit deny for anonymous users (defense in depth)
CREATE POLICY "Deny anonymous access to purchases" 
ON public.purchases 
FOR ALL 
TO anon
USING (false);