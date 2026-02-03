
-- Fix random hunt badge assignment:
-- - Exclude locked badges (is_locked=true)
-- - Work for both INSERT + UPDATE triggers (TG_OP)
-- - On activation, enforce exactly one enabled holder by resetting is_enabled

CREATE OR REPLACE FUNCTION public.assign_hunt_badge_on_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_random_user_id uuid;
  v_should_assign boolean;
BEGIN
  -- Only for hunt events with a target badge
  IF NEW.event_type <> 'hunt' OR NEW.target_badge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine if this row just became active
  IF TG_OP = 'INSERT' THEN
    v_should_assign := (NEW.is_active = true);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_assign := (NEW.is_active = true AND (OLD.is_active IS DISTINCT FROM true));
  ELSE
    v_should_assign := false;
  END IF;

  IF NOT v_should_assign THEN
    RETURN NEW;
  END IF;

  -- Pick a random eligible owner (must exist in profiles + not locked)
  SELECT ub.user_id
  INTO v_random_user_id
  FROM user_badges ub
  JOIN profiles p ON p.user_id = ub.user_id
  WHERE ub.badge_id = NEW.target_badge_id
    AND COALESCE(ub.is_locked, false) = false
  ORDER BY random()
  LIMIT 1;

  IF v_random_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Enforce: exactly one enabled holder for this hunt badge
  UPDATE user_badges
  SET is_enabled = false
  WHERE badge_id = NEW.target_badge_id;

  UPDATE user_badges
  SET is_enabled = true
  WHERE badge_id = NEW.target_badge_id
    AND user_id = v_random_user_id;

  RETURN NEW;
END;
$$;
