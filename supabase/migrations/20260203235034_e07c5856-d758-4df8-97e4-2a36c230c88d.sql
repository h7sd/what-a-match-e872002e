-- Update get_hunt_badge_holder to correctly return current holder
-- The current holder is either the last thief (from badge_steals) or the user with is_enabled=true

CREATE OR REPLACE FUNCTION public.get_hunt_badge_holder(p_event_id uuid)
RETURNS TABLE(user_id uuid, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_badge_id uuid;
  v_holder_user_id uuid;
BEGIN
  -- Get the target badge for this event
  SELECT be.target_badge_id INTO v_target_badge_id
  FROM badge_events be
  WHERE be.id = p_event_id;
  
  IF v_target_badge_id IS NULL THEN
    RETURN;
  END IF;
  
  -- First, check if there's an active steal (not returned) - that's the current holder
  SELECT bs.thief_user_id INTO v_holder_user_id
  FROM badge_steals bs
  WHERE bs.event_id = p_event_id 
    AND bs.badge_id = v_target_badge_id 
    AND bs.returned = false
  ORDER BY bs.stolen_at DESC
  LIMIT 1;
  
  -- If no active steal, find the user who has the badge enabled (original holder)
  IF v_holder_user_id IS NULL THEN
    SELECT ub.user_id INTO v_holder_user_id
    FROM user_badges ub
    WHERE ub.badge_id = v_target_badge_id 
      AND ub.is_enabled = true
      AND COALESCE(ub.is_locked, false) = false
    LIMIT 1;
  END IF;
  
  IF v_holder_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the holder with their username
  RETURN QUERY
  SELECT p.user_id, p.username
  FROM profiles p
  WHERE p.user_id = v_holder_user_id;
END;
$$;