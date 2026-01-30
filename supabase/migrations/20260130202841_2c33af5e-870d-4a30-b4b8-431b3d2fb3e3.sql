-- Allow service role (auth.uid() is NULL) to update uid_number
CREATE OR REPLACE FUNCTION public.prevent_uid_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If uid_number is being changed
  IF OLD.uid_number IS DISTINCT FROM NEW.uid_number THEN
    -- Allow if:
    -- 1. auth.uid() is NULL (service role / edge function call)
    -- 2. User is an admin
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'uid_number cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;