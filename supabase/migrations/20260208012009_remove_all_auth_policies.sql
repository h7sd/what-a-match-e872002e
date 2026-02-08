/*
  # Remove ALL policies from auth schema tables

  GoTrue needs unfettered access to auth schema tables.
  RLS without the right policies breaks authentication.

  1. Changes
    - Drop all policies on auth.users
    - Drop all policies on auth.sessions
    - Drop all policies on auth.identities
    - Drop all policies on auth.audit_log_entries
    - Drop all policies on auth.flow_state
    - Drop all policies on auth.mfa_challenges
    - Drop all policies on auth.mfa_factors
    - Drop all policies on auth.one_time_tokens
    - Drop all policies on auth.refresh_tokens
*/

DROP POLICY IF EXISTS "Users can read own user data" ON auth.users;
DROP POLICY IF EXISTS "Allow read access for FK validation" ON auth.users;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.audit_log_entries;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.flow_state;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.identities;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.mfa_challenges;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.mfa_factors;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.one_time_tokens;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.refresh_tokens;
DROP POLICY IF EXISTS "Allow authenticated and service role access" ON auth.sessions;