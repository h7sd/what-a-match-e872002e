-- Hardened service-role bypass for UID changes (supports different JWT claim layouts)
CREATE OR REPLACE FUNCTION public.prevent_uid_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text;
  jwt_claims json;
BEGIN
  IF OLD.uid_number IS DISTINCT FROM NEW.uid_number THEN
    -- Role can appear either as a direct claim (request.jwt.claim.role)
    -- or inside request.jwt.claims JSON depending on gateway/version.
    jwt_role := current_setting('request.jwt.claim.role', true);

    IF jwt_role IS NULL THEN
      BEGIN
        jwt_claims := current_setting('request.jwt.claims', true)::json;
        jwt_role := jwt_claims->>'role';
      EXCEPTION WHEN others THEN
        jwt_role := NULL;
      END;
    END IF;

    -- Allow backend service-role updates (used by server-side functions)
    IF jwt_role IN ('service_role', 'supabase_admin') THEN
      RETURN NEW;
    END IF;

    -- Otherwise: only admins can modify uid_number
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'uid_number cannot be modified';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;