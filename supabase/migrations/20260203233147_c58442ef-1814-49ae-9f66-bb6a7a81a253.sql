
-- Update get_hunt_badge_holder to prioritize enabled badges
DROP FUNCTION IF EXISTS public.get_hunt_badge_holder(uuid);

CREATE FUNCTION public.get_hunt_badge_holder(p_event_id uuid)
RETURNS TABLE(user_id uuid, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_badge_id uuid;
  v_current_holder_user_id uuid;
BEGIN
  -- Get the target badge for this hunt event
  SELECT be.target_badge_id INTO v_target_badge_id
  FROM badge_events be
  WHERE be.id = p_event_id AND be.event_type = 'hunt' AND be.is_active = true;
  
  IF v_target_badge_id IS NULL THEN
    RETURN;
  END IF;
  
  -- First check if the badge is currently stolen (active steal)
  SELECT bs.thief_user_id INTO v_current_holder_user_id
  FROM badge_steals bs
  WHERE bs.badge_id = v_target_badge_id 
    AND bs.returned = false
  ORDER BY bs.stolen_at DESC
  LIMIT 1;
  
  -- If no active steal, find the user who has the badge ENABLED
  IF v_current_holder_user_id IS NULL THEN
    SELECT ub.user_id INTO v_current_holder_user_id
    FROM user_badges ub
    WHERE ub.badge_id = v_target_badge_id AND ub.is_enabled = true
    LIMIT 1;
  END IF;
  
  -- Return the holder info
  IF v_current_holder_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT v_current_holder_user_id, p.username::text
    FROM profiles p
    WHERE p.user_id = v_current_holder_user_id;
  END IF;
END;
$$;
