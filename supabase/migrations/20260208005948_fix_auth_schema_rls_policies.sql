/*
  # Fix Auth Schema RLS Policies
  
  1. Problem
    - Multiple tables in auth schema have RLS enabled but no policies
    - This blocks Supabase Auth from functioning properly
    - Tables: sessions, identities, refresh_tokens, audit_log_entries, etc.
    
  2. Solution
    - Create permissive policies for critical auth tables
    - Allow authenticated and service_role access
    
  3. Security
    - Auth system tables need to be accessible for auth operations
*/

-- Sessions table policies
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.sessions;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.sessions FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Identities table policies  
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.identities;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.identities FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Refresh tokens table policies
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.refresh_tokens;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.refresh_tokens FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Audit log entries table policies
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.audit_log_entries;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.audit_log_entries FOR SELECT
  TO authenticated, service_role
  USING (true);

-- MFA challenges
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.mfa_challenges;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.mfa_challenges FOR SELECT
  TO authenticated, service_role
  USING (true);

-- MFA factors
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.mfa_factors;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.mfa_factors FOR SELECT
  TO authenticated, service_role
  USING (true);

-- One time tokens
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.one_time_tokens;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.one_time_tokens FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Flow state
DROP POLICY IF EXISTS "Allow authenticated access" ON auth.flow_state;
CREATE POLICY "Allow authenticated and service role access"
  ON auth.flow_state FOR SELECT
  TO authenticated, service_role
  USING (true);
