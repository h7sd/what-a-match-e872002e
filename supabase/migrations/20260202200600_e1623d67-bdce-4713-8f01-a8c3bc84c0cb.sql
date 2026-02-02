-- Prevent privilege escalation: Users cannot modify their own roles
-- Drop existing policies and recreate with stricter rules
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Users can only view their own roles (read-only)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert roles, but NOT for themselves (prevent self-elevation)
CREATE POLICY "Admins can insert roles for others"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND user_id != auth.uid()
);

-- Admins can update roles, but NOT their own
CREATE POLICY "Admins can update roles for others"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND user_id != auth.uid()
);

-- Admins can delete roles, but NOT their own
CREATE POLICY "Admins can delete roles for others"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND user_id != auth.uid()
);

-- Create trigger to prevent ANY self-role modification (defense in depth)
CREATE OR REPLACE FUNCTION public.prevent_self_role_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
  jwt_claims json;
BEGIN
  -- Allow service_role bypass (for Edge Functions)
  jwt_role := current_setting('request.jwt.claim.role', true);
  
  IF jwt_role IS NULL THEN
    BEGIN
      jwt_claims := current_setting('request.jwt.claims', true)::json;
      jwt_role := jwt_claims->>'role';
    EXCEPTION WHEN others THEN
      jwt_role := NULL;
    END;
  END IF;
  
  IF jwt_role IN ('service_role', 'supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Block if user is trying to modify their own role
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot modify your own role - privilege escalation blocked';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot delete your own role';
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS prevent_self_role_change ON public.user_roles;
CREATE TRIGGER prevent_self_role_change
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_modification();