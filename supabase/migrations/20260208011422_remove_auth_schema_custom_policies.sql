/*
  # Remove all custom policies from auth schema tables
  
  These policies were incorrectly added to auth schema tables.
  GoTrue (supabase_auth_admin) owns these tables and bypasses RLS.
  Custom policies on auth tables can interfere with GoTrue operations.

  1. Changes
    - Drop all custom SELECT policies from auth.users
    - Drop all custom SELECT policies from auth.audit_log_entries
    - Drop all custom SELECT policies from auth.flow_state
    - Drop all custom SELECT policies from auth.identities
    - Drop all custom SELECT policies from auth.mfa_challenges
    - Drop all custom SELECT policies from auth.mfa_factors
    - Drop all custom SELECT policies from auth.one_time_tokens
    - Drop all custom SELECT policies from auth.refresh_tokens
    - Drop all custom SELECT policies from auth.sessions
*/

DROP POLICY IF EXISTS "Allow read access for FK validation" ON auth.users;
DROP POLICY IF EXISTS "Users can read own user data" ON auth.users;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.audit_log_entries;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.flow_state;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.identities;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.mfa_challenges;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.mfa_factors;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.one_time_tokens;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.refresh_tokens;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.sessions;