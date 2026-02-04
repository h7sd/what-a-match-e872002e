-- Add policy allowing users to insert badges during active hunt events
CREATE POLICY "Users can receive hunt badges during events"
ON public.user_badges
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM badge_events 
    WHERE is_active = true 
    AND event_type = 'hunt'
    AND target_badge_id = badge_id
  )
);

-- Add policy allowing badge disabling during hunt events
CREATE POLICY "Hunt event badge updates"
ON public.user_badges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM badge_events 
    WHERE is_active = true 
    AND event_type = 'hunt'
    AND target_badge_id = user_badges.badge_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM badge_events 
    WHERE is_active = true 
    AND event_type = 'hunt'
    AND target_badge_id = user_badges.badge_id
  )
);