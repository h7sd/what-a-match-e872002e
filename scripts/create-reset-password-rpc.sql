-- This function verifies a password reset code and updates the password
-- It runs as SECURITY DEFINER (superuser) so it can access verification_codes and auth.users
-- Call from frontend: supabase.rpc('verify_and_reset_password', { p_email, p_code, p_new_password })

CREATE OR REPLACE FUNCTION public.verify_and_reset_password(
  p_email TEXT,
  p_code TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_code_record RECORD;
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- Normalize inputs
  p_email := LOWER(TRIM(p_email));
  p_code := TRIM(p_code);

  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;
  IF p_code IS NULL OR p_code = '' THEN
    RETURN json_build_object('success', false, 'error', 'Code is required');
  END IF;
  IF p_new_password IS NULL OR LENGTH(p_new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;

  -- 1. Find valid verification code
  SELECT id INTO v_code_record
  FROM verification_codes
  WHERE email = p_email
    AND code = p_code
    AND type = 'password_reset'
    AND used_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_code_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired reset code');
  END IF;

  -- 2. Mark code as used immediately
  UPDATE verification_codes
  SET used_at = NOW()
  WHERE id = v_code_record.id;

  -- 3. Find user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 4. Hash the new password using Supabase's built-in crypt function
  v_hashed_password := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  -- 5. Update the password directly in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_hashed_password,
    updated_at = NOW(),
    password_changed_at = NOW()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Password updated successfully');
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.verify_and_reset_password(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_and_reset_password(TEXT, TEXT, TEXT) TO authenticated;
