-- Import ALL real auth.users from the Lovable Supabase export
-- This script reads the JSON export and inserts all non-health-check users

-- First, clean up any leftover entries
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Now we need to insert users from the JSON export
-- Since we can't read JSON files directly in SQL, we'll generate INSERT statements

-- The approach: Create a temporary function that accepts the JSON and imports all users
CREATE OR REPLACE FUNCTION import_auth_users(p_users_json JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user JSONB;
  v_count INT := 0;
  v_skipped INT := 0;
BEGIN
  FOR v_user IN SELECT jsonb_array_elements(p_users_json)
  LOOP
    -- Skip health_check and test users
    IF (v_user->>'email') LIKE 'health_check%' 
       OR (v_user->>'email') LIKE '%@test.invalid' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert into auth.users
    BEGIN
      INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password,
        email_confirmed_at,
        phone,
        phone_confirmed_at,
        confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        is_sso_user,
        deleted_at,
        role,
        aud,
        instance_id
      ) VALUES (
        (v_user->>'id')::UUID,
        v_user->>'email',
        v_user->>'encrypted_password',
        (v_user->>'email_confirmed_at')::TIMESTAMPTZ,
        v_user->>'phone',
        (v_user->>'phone_confirmed_at')::TIMESTAMPTZ,
        (v_user->>'confirmed_at')::TIMESTAMPTZ,
        (v_user->>'last_sign_in_at')::TIMESTAMPTZ,
        COALESCE((v_user->'raw_app_meta_data')::JSONB, '{"provider":"email","providers":["email"]}'::JSONB),
        COALESCE((v_user->'raw_user_meta_data')::JSONB, '{}'::JSONB),
        (v_user->>'is_super_admin')::BOOLEAN,
        (v_user->>'created_at')::TIMESTAMPTZ,
        (v_user->>'updated_at')::TIMESTAMPTZ,
        COALESCE((v_user->>'is_sso_user')::BOOLEAN, false),
        (v_user->>'deleted_at')::TIMESTAMPTZ,
        COALESCE(v_user->>'role', 'authenticated'),
        COALESCE(v_user->>'aud', 'authenticated'),
        '00000000-0000-0000-0000-000000000000'::UUID
      )
      ON CONFLICT (id) DO NOTHING;

      -- Also create identity record for email provider
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        created_at,
        updated_at,
        last_sign_in_at
      ) VALUES (
        gen_random_uuid(),
        (v_user->>'id')::UUID,
        jsonb_build_object(
          'sub', v_user->>'id',
          'email', v_user->>'email',
          'email_verified', true
        ),
        'email',
        (v_user->>'id')::text,
        COALESCE((v_user->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_user->>'updated_at')::TIMESTAMPTZ, NOW()),
        (v_user->>'last_sign_in_at')::TIMESTAMPTZ
      )
      ON CONFLICT DO NOTHING;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip errors and continue
      v_skipped := v_skipped + 1;
      CONTINUE;
    END;
  END LOOP;

  RETURN 'Imported: ' || v_count || ', Skipped: ' || v_skipped;
END;
$$;
