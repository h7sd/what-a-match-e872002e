-- Allow users to self-claim ONLY the EARLY badge (with a global 100-claim cap)

-- 1) RLS: Allow authenticated users to insert their own EARLY badge claim
DROP POLICY IF EXISTS "Users can claim EARLY badge" ON public.user_badges;
CREATE POLICY "Users can claim EARLY badge"
ON public.user_badges
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.global_badges gb
    WHERE gb.id = badge_id
      AND lower(gb.name) = 'early'
  )
);

-- 2) Trigger: Update badge-claim validation to allow EARLY self-claims, enforce cap + (optional) deadline
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
  early_deadline timestamptz := '2026-02-27T00:00:00Z';
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