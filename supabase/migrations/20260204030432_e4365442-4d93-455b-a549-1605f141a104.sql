
-- 1) Remove overly permissive policy introduced for steal events
DROP POLICY IF EXISTS "Steal event badge updates" ON public.user_badges;

-- 2) Update validate_badge_claim() to allow temporary transfers done by steal_badge()
--    without requiring admin role and without incrementing claims_count.
CREATE OR REPLACE FUNCTION public.validate_badge_claim()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  badge_record RECORD;
  is_admin BOOLEAN;
  jwt_role text;
  jwt_claims json;
  is_early boolean;
  is_hunt_target boolean;
  already_has boolean;
  early_deadline timestamptz := '2026-02-27T00:00:00Z';
  bypass_context text;
BEGIN
  -- Determine JWT role (service_role bypass support)
  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role IS NULL THEN
    BEGIN
      jwt_claims := current_setting('request.jwt.claims', true)::json;
      jwt_role := jwt_claims->>'role';
    EXCEPTION WHEN others THEN
      jwt_role := NULL;
    END;
  END IF;

  -- Check if the current user is an admin
  SELECT has_role(auth.uid(), 'admin') INTO is_admin;

  -- Get badge details
  SELECT * INTO badge_record
  FROM public.global_badges
  WHERE id = NEW.badge_id;

  IF badge_record IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  is_early := (lower(badge_record.name) = 'early');

  -- Special internal context used by steal_badge() to perform temporary transfers.
  -- Defense in depth: only allow when an active STEAL event exists AND users can only receive for themselves.
  bypass_context := current_setting('app.badge_claim_context', true);
  IF bypass_context = 'steal_badge' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.badge_events be
      WHERE be.is_active = true
        AND be.event_type = 'steal'
    ) THEN
      RAISE EXCEPTION 'No active steal event';
    END IF;

    IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Cannot claim badge for another user';
    END IF;

    -- Allow upsert path (ON CONFLICT DO UPDATE) without raising duplicate errors
    SELECT EXISTS (
      SELECT 1
      FROM public.user_badges ub
      WHERE ub.user_id = NEW.user_id
        AND ub.badge_id = NEW.badge_id
    ) INTO already_has;

    -- IMPORTANT: do NOT increment global_badges.claims_count for steals (temporary transfers)
    RETURN NEW;
  END IF;

  -- Is this badge currently the target of an active hunt event?
  SELECT EXISTS (
    SELECT 1
    FROM public.badge_events be
    WHERE be.is_active = true
      AND be.event_type = 'hunt'
      AND be.target_badge_id = NEW.badge_id
  ) INTO is_hunt_target;

  -- Special-case: active HUNT target badge
  -- - allow authenticated users to receive it for themselves (used by hunt upsert)
  -- - allow admins/service_role to assign initial holder on activation
  -- - if they already have it, don't raise (so ON CONFLICT can DO UPDATE)
  -- - avoid incrementing claims_count for existing owners
  IF is_hunt_target THEN
    -- Defense in depth: authenticated users can only receive it for themselves,
    -- except admins/service_role (needed for random initial assignment on activation)
    IF auth.uid() IS NOT NULL
       AND NEW.user_id <> auth.uid()
       AND NOT COALESCE(is_admin, false)
       AND jwt_role NOT IN ('service_role', 'supabase_admin') THEN
      RAISE EXCEPTION 'Cannot claim badge for another user';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_badges ub
      WHERE ub.user_id = NEW.user_id
        AND ub.badge_id = NEW.badge_id
    ) INTO already_has;

    -- Already owned: allow upsert/update path (do not count as a new claim)
    IF already_has THEN
      RETURN NEW;
    END IF;

    -- New owner during hunt: allow without admin requirement.
    -- (We intentionally skip limited-claim enforcement here to avoid hunts being blocked.)
    UPDATE public.global_badges
    SET claims_count = COALESCE(claims_count, 0) + 1
    WHERE id = NEW.badge_id;

    RETURN NEW;
  END IF;

  -- Block self-assignment for all badges EXCEPT EARLY
  IF NOT is_early
     AND jwt_role NOT IN ('service_role', 'supabase_admin')
     AND auth.uid() IS NOT NULL
     AND NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can assign badges';
  END IF;

  -- Prevent claiming for another user (defense in depth)
  IF is_early AND auth.uid() IS NOT NULL AND NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim badge for another user';
  END IF;

  -- Prevent duplicate claims
  IF EXISTS (
    SELECT 1
    FROM public.user_badges ub
    WHERE ub.user_id = NEW.user_id
      AND ub.badge_id = NEW.badge_id
  ) THEN
    RAISE EXCEPTION 'Badge already claimed';
  END IF;

  -- EARLY deadline (only enforce for normal users; admins/service_role can still assign if needed)
  IF is_early
     AND jwt_role NOT IN ('service_role', 'supabase_admin')
     AND NOT COALESCE(is_admin, false)
     AND now() >= early_deadline THEN
    RAISE EXCEPTION 'EARLY badge claiming period has ended';
  END IF;

  -- Claim limit enforcement:
  -- - EARLY: strict (no bypass)
  -- - Other limited badges: admins/service_role can bypass
  IF badge_record.is_limited AND badge_record.max_claims IS NOT NULL THEN
    IF COALESCE(badge_record.claims_count, 0) >= badge_record.max_claims THEN
      IF is_early THEN
        RAISE EXCEPTION 'Badge claim limit reached';
      END IF;

      -- Only block non-admin/non-service_role for non-EARLY badges
      IF jwt_role NOT IN ('service_role', 'supabase_admin') AND NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Badge claim limit reached';
      END IF;
    END IF;
  END IF;

  -- Increment claims count atomically
  UPDATE public.global_badges
  SET claims_count = COALESCE(claims_count, 0) + 1
  WHERE id = NEW.badge_id;

  RETURN NEW;
END;
$function$;

-- 3) Update steal_badge() to set a transaction-local context flag so the trigger can allow temporary transfers.
CREATE OR REPLACE FUNCTION public.steal_badge(p_victim_username text, p_badge_name text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(success boolean, message text, stolen_badge_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_thief_id uuid;
  v_victim_id uuid;
  v_badge_id uuid;
  v_event record;
  v_duration_hours int;
  v_current_holder_id uuid;
BEGIN
  v_thief_id := auth.uid();

  IF v_thief_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text, NULL::text;
    RETURN;
  END IF;

  -- Get victim user_id from username
  SELECT p.user_id INTO v_victim_id
  FROM profiles p
  WHERE lower(p.username) = lower(p_victim_username);

  IF v_victim_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::text, NULL::text;
    RETURN;
  END IF;

  IF v_thief_id = v_victim_id THEN
    RETURN QUERY SELECT false, 'Cannot hunt your own badge'::text, NULL::text;
    RETURN;
  END IF;

  -- Get the active event
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_event FROM badge_events WHERE id = p_event_id AND is_active = true;
  ELSE
    SELECT * INTO v_event FROM badge_events WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_event IS NULL THEN
    RETURN QUERY SELECT false, 'No active event'::text, NULL::text;
    RETURN;
  END IF;

  v_duration_hours := COALESCE(v_event.steal_duration_hours, 168);

  -- HUNT EVENT LOGIC
  IF v_event.event_type = 'hunt' THEN
    -- For hunt events, only the target badge can be hunted
    IF v_event.target_badge_id IS NULL THEN
      RETURN QUERY SELECT false, 'Hunt event has no target badge'::text, NULL::text;
      RETURN;
    END IF;

    v_badge_id := v_event.target_badge_id;

    -- Check who currently holds the badge (either original owner with is_enabled=true, or last thief)
    -- First check if there's an active steal
    SELECT bs.thief_user_id INTO v_current_holder_id
    FROM badge_steals bs
    WHERE bs.event_id = v_event.id
      AND bs.badge_id = v_badge_id
      AND bs.returned = false
    ORDER BY bs.stolen_at DESC
    LIMIT 1;

    -- If no active steal, check who has the badge enabled
    IF v_current_holder_id IS NULL THEN
      SELECT ub.user_id INTO v_current_holder_id
      FROM user_badges ub
      WHERE ub.badge_id = v_badge_id
        AND ub.is_enabled = true
        AND COALESCE(ub.is_locked, false) = false
      LIMIT 1;
    END IF;

    -- Victim must be the current holder
    IF v_current_holder_id IS NULL OR v_current_holder_id != v_victim_id THEN
      RETURN QUERY SELECT false, 'This user is not the current badge holder'::text, NULL::text;
      RETURN;
    END IF;

    -- Mark all previous steals for this event as returned (chain moves on)
    UPDATE badge_steals
    SET returned = true, returned_at = now()
    WHERE event_id = v_event.id
      AND badge_id = v_badge_id
      AND returned = false;

    -- Disable the badge for the victim
    UPDATE user_badges
    SET is_enabled = false
    WHERE badge_id = v_badge_id AND user_id = v_victim_id;

    -- Enable for thief (or insert if they don't have it)
    INSERT INTO user_badges (user_id, badge_id, is_enabled, display_order)
    VALUES (v_thief_id, v_badge_id, true, 0)
    ON CONFLICT (user_id, badge_id)
    DO UPDATE SET is_enabled = true;

    -- Force badges visible for the new holder
    UPDATE profiles
    SET show_badges = true
    WHERE user_id = v_thief_id;

    -- Record the steal (with far future returns_at since it won't be returned automatically)
    INSERT INTO badge_steals (event_id, badge_id, thief_user_id, victim_user_id, returns_at)
    VALUES (v_event.id, v_badge_id, v_thief_id, v_victim_id, now() + interval '100 years');

    RETURN QUERY SELECT true, 'Badge hunted successfully!'::text, (SELECT name FROM global_badges WHERE id = v_badge_id);
    RETURN;
  END IF;

  -- STEAL EVENT LOGIC
  -- Mark context so badge-claim validation trigger allows temporary transfer.
  PERFORM set_config('app.badge_claim_context', 'steal_badge', true);

  -- Get badge by name from victim
  SELECT ub.badge_id INTO v_badge_id
  FROM user_badges ub
  JOIN global_badges gb ON gb.id = ub.badge_id
  WHERE ub.user_id = v_victim_id
    AND lower(gb.name) = lower(p_badge_name)
    AND ub.is_enabled = true
    AND COALESCE(ub.is_locked, false) = false;

  IF v_badge_id IS NULL THEN
    RETURN QUERY SELECT false, 'Badge not found or not stealable'::text, NULL::text;
    RETURN;
  END IF;

  -- Check if thief already stole in this event (only for steal events)
  IF EXISTS (
    SELECT 1 FROM badge_steals
    WHERE thief_user_id = v_thief_id
      AND event_id = v_event.id
  ) THEN
    RETURN QUERY SELECT false, 'You already stole a badge in this event'::text, NULL::text;
    RETURN;
  END IF;

  -- Disable the badge for victim
  UPDATE user_badges
  SET is_enabled = false
  WHERE badge_id = v_badge_id AND user_id = v_victim_id;

  -- Give badge to thief (or enable if already has)
  INSERT INTO user_badges (user_id, badge_id, is_enabled, display_order)
  VALUES (v_thief_id, v_badge_id, true, 0)
  ON CONFLICT (user_id, badge_id)
  DO UPDATE SET is_enabled = true;

  -- Record the steal
  INSERT INTO badge_steals (event_id, badge_id, thief_user_id, victim_user_id, returns_at)
  VALUES (v_event.id, v_badge_id, v_thief_id, v_victim_id, now() + (v_duration_hours || ' hours')::interval);

  RETURN QUERY SELECT true, 'Badge stolen!'::text, (SELECT name FROM global_badges WHERE id = v_badge_id);
END;
$function$;
