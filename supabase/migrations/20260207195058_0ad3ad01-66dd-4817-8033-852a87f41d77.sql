-- Create admin-only function to export auth.users for migration
-- This includes encrypted_password so users can log in on the new instance
CREATE OR REPLACE FUNCTION public.export_auth_users_for_migration()
RETURNS TABLE (
  id uuid,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone text,
  phone_confirmed_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_sso_user boolean,
  deleted_at timestamptz,
  role text,
  aud text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.encrypted_password::text,
    u.email_confirmed_at,
    u.phone::text,
    u.phone_confirmed_at,
    u.confirmed_at,
    u.last_sign_in_at,
    u.raw_app_meta_data,
    u.raw_user_meta_data,
    u.is_super_admin,
    u.created_at,
    u.updated_at,
    u.is_sso_user,
    u.deleted_at,
    u.role::text,
    u.aud::text
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;