-- Fix: Allow service role to bypass badge claim limit (for admin assignments)
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
BEGIN
  -- Check JWT role for service_role bypass
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
  
  -- If not called by admin or service role, reject
  IF jwt_role NOT IN ('service_role', 'supabase_admin') AND auth.uid() IS NOT NULL AND NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can assign badges';
  END IF;
  
  -- Get badge details for validation
  SELECT * INTO badge_record
  FROM global_badges
  WHERE id = NEW.badge_id;
  
  IF badge_record IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;
  
  -- Check if limited badge and at capacity - BUT allow service_role/admins to bypass
  IF badge_record.is_limited AND badge_record.max_claims IS NOT NULL THEN
    IF badge_record.claims_count >= badge_record.max_claims THEN
      -- Only block if NOT service_role and NOT admin
      IF jwt_role NOT IN ('service_role', 'supabase_admin') AND NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Badge claim limit reached';
      END IF;
      -- Admins and service_role can still assign beyond limit
    END IF;
  END IF;
  
  -- Increment claims count atomically
  UPDATE global_badges
  SET claims_count = COALESCE(claims_count, 0) + 1
  WHERE id = NEW.badge_id;
  
  RETURN NEW;
END;
$function$;