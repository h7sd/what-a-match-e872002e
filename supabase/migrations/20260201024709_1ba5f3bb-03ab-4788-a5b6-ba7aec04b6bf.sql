-- Create a trigger to ensure cross-column uniqueness between username and alias_username
-- This prevents an alias from being the same as any existing username and vice versa

CREATE OR REPLACE FUNCTION public.check_username_alias_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When updating/inserting username, check it doesn't exist as anyone else's alias_username
  IF NEW.username IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE alias_username = NEW.username 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'This username is already taken as an alias by another user';
    END IF;
  END IF;

  -- When updating/inserting alias_username, check it doesn't exist as anyone else's username
  IF NEW.alias_username IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE username = NEW.alias_username 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'This alias is already taken as a username by another user';
    END IF;
    
    -- Also check it doesn't exist as anyone else's alias_username
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE alias_username = NEW.alias_username 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'This alias is already taken by another user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_username_alias_uniqueness ON public.profiles;
CREATE TRIGGER enforce_username_alias_uniqueness
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_username_alias_uniqueness();