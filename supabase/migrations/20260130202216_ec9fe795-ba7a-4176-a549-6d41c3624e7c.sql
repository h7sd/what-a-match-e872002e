-- Revert: Only admins can change UID, not profile owners
CREATE OR REPLACE FUNCTION public.prevent_uid_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If uid_number is being changed
  IF OLD.uid_number IS DISTINCT FROM NEW.uid_number THEN
    -- Only allow if user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'uid_number cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;