-- Fix the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;

-- Allow authenticated users to receive notifications (system inserts via service role bypass RLS anyway)
CREATE POLICY "Authenticated users can receive notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);