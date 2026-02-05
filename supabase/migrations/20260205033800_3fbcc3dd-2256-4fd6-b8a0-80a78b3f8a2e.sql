-- Fix overly permissive RLS policies flagged by linter

-- bot_command_notifications: restrict write access to service_role explicitly
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.bot_command_notifications;

CREATE POLICY "Service role can manage notifications"
ON public.bot_command_notifications
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- link_clicks: avoid WITH CHECK (true) even for service_role
DROP POLICY IF EXISTS "Service role can record link clicks" ON public.link_clicks;

CREATE POLICY "Service role can record link clicks"
ON public.link_clicks
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');