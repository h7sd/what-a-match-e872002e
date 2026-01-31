-- Fix link_clicks RLS: Restrict INSERT to service_role only (edge function uses service role)
DROP POLICY IF EXISTS "Anyone can record link clicks" ON public.link_clicks;

-- Only service_role (used by edge functions) can insert link clicks
-- This prevents direct database manipulation to inflate click counts
CREATE POLICY "Service role can record link clicks"
ON public.link_clicks FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure authenticated users can still view their own link analytics (no change needed, policy exists)