
-- Ensure triggers point to the latest function definition and reduce unnecessary firing
DROP TRIGGER IF EXISTS on_hunt_event_activation ON public.badge_events;
CREATE TRIGGER on_hunt_event_activation
  AFTER UPDATE OF is_active ON public.badge_events
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_hunt_badge_on_activation();

DROP TRIGGER IF EXISTS on_hunt_event_insert ON public.badge_events;
CREATE TRIGGER on_hunt_event_insert
  AFTER INSERT ON public.badge_events
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_hunt_badge_on_activation();

-- Also ignore locked holders when resolving current hunt target
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
  SELECT be.target_badge_id INTO v_target_badge_id
  FROM badge_events be
  WHERE be.id = p_event_id AND be.event_type = 'hunt' AND be.is_active = true;

  IF v_target_badge_id IS NULL THEN
    RETURN;
  END IF;

  -- Active steal: the thief is the current holder
  SELECT bs.thief_user_id INTO v_current_holder_user_id
  FROM badge_steals bs
  WHERE bs.badge_id = v_target_badge_id
    AND bs.returned = false
  ORDER BY bs.stolen_at DESC
  LIMIT 1;

  -- Otherwise: enabled + not locked
  IF v_current_holder_user_id IS NULL THEN
    SELECT ub.user_id INTO v_current_holder_user_id
    FROM user_badges ub
    WHERE ub.badge_id = v_target_badge_id
      AND ub.is_enabled = true
      AND COALESCE(ub.is_locked, false) = false
    LIMIT 1;
  END IF;

  IF v_current_holder_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT v_current_holder_user_id, p.username::text
    FROM profiles p
    WHERE p.user_id = v_current_holder_user_id;
  END IF;
END;
$$;
