-- Fix the security warning by setting search_path on is_protected_uid
CREATE OR REPLACE FUNCTION public.is_protected_uid(uid integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT uid = ANY(ARRAY[911]);
$$;