-- Create a function to get the next available UID, skipping protected ones
CREATE OR REPLACE FUNCTION public.get_next_available_uid()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_uid integer;
  protected_uids integer[] := ARRAY[911]; -- Protected UIDs that cannot be claimed
BEGIN
  -- Get the next value from the sequence
  next_uid := nextval('profiles_uid_number_seq');
  
  -- Keep incrementing if we hit a protected UID
  WHILE next_uid = ANY(protected_uids) LOOP
    next_uid := nextval('profiles_uid_number_seq');
  END LOOP;
  
  RETURN next_uid;
END;
$$;

-- Update the trigger function that assigns UIDs to new profiles
CREATE OR REPLACE FUNCTION public.assign_uid_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use the safe function that skips protected UIDs
  NEW.uid_number := get_next_available_uid();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS assign_uid_on_insert ON public.profiles;

CREATE TRIGGER assign_uid_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_uid_number();

-- Also update the admin-update-profile edge function validation by adding a check function
CREATE OR REPLACE FUNCTION public.is_protected_uid(uid integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT uid = ANY(ARRAY[911]);
$$;