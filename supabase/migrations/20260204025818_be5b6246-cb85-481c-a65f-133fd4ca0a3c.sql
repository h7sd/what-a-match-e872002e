
-- Add RLS policy to allow steal_badge function to insert/update badges during steal events
-- This policy allows inserts/updates when there's an active steal event
CREATE POLICY "Steal event badge updates" ON public.user_badges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM badge_events 
    WHERE is_active = true 
    AND event_type = 'steal'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM badge_events 
    WHERE is_active = true 
    AND event_type = 'steal'
  )
);
