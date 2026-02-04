-- Fix: Assign hunt badge to a random eligible user when event is activated
-- This ensures the badge is given to SOMEONE when the event starts

CREATE OR REPLACE FUNCTION public.assign_hunt_badge_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_random_user_id uuid;
  v_should_assign boolean;
  v_current_holders_count integer;
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

  -- First, disable the badge for ALL current owners
  UPDATE user_badges
  SET is_enabled = false
  WHERE badge_id = NEW.target_badge_id;

  -- Count how many users have this badge at all
  SELECT COUNT(*) INTO v_current_holders_count
  FROM user_badges
  WHERE badge_id = NEW.target_badge_id
    AND COALESCE(is_locked, false) = false;

  -- If no one has the badge yet, we need to assign it to a random user
  IF v_current_holders_count = 0 THEN
    -- Pick a random user who has a profile
    SELECT p.user_id INTO v_random_user_id
    FROM profiles p
    ORDER BY random()
    LIMIT 1;

    IF v_random_user_id IS NOT NULL THEN
      -- Insert the badge for this user
      INSERT INTO user_badges (user_id, badge_id, is_enabled, display_order)
      VALUES (v_random_user_id, NEW.target_badge_id, true, 0)
      ON CONFLICT (user_id, badge_id) DO UPDATE SET is_enabled = true;
      
      RAISE NOTICE 'Hunt badge assigned to new random user: %', v_random_user_id;
    END IF;
  ELSE
    -- Pick a random existing eligible owner
    SELECT ub.user_id INTO v_random_user_id
    FROM user_badges ub
    JOIN profiles p ON p.user_id = ub.user_id
    WHERE ub.badge_id = NEW.target_badge_id
      AND COALESCE(ub.is_locked, false) = false
    ORDER BY random()
    LIMIT 1;

    IF v_random_user_id IS NOT NULL THEN
      -- Enable ONLY for the randomly selected user
      UPDATE user_badges
      SET is_enabled = true
      WHERE badge_id = NEW.target_badge_id
        AND user_id = v_random_user_id;
        
      RAISE NOTICE 'Hunt badge enabled for random existing owner: %', v_random_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS assign_hunt_badge_trigger ON public.badge_events;
CREATE TRIGGER assign_hunt_badge_trigger
BEFORE INSERT OR UPDATE ON public.badge_events
FOR EACH ROW
EXECUTE FUNCTION assign_hunt_badge_on_activation();