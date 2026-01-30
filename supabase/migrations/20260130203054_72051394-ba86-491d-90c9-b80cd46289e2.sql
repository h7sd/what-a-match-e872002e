-- Fix: allow service_role JWTs to bypass uid_number immutability
CREATE OR REPLACE FUNCTION public.prevent_uid_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text;
BEGIN
  IF OLD.uid_number IS DISTINCT FROM NEW.uid_number THEN
    jwt_role := current_setting('request.jwt.claim.role', true);

    -- Allow backend service role updates (used by server-side functions)
    IF jwt_role = 'service_role' THEN
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