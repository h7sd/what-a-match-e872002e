-- Update the prevent_uid_change trigger function to allow users to change their own UID
CREATE OR REPLACE FUNCTION public.prevent_uid_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If uid_number is being changed
  IF OLD.uid_number IS DISTINCT FROM NEW.uid_number THEN
    -- Allow if user is an admin OR if user is the owner of this profile
    IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = OLD.user_id) THEN
      RAISE EXCEPTION 'uid_number cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;