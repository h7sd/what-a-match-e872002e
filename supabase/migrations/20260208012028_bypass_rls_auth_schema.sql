/*
  # Bypass RLS on auth schema for service operations

  Since GoTrue needs unfettered access and RLS cannot be disabled via migrations,
  we create permissive policies that allow all operations.

  1. Changes  
    - Add permissive ALL policies to auth.users for service_role
    - Add permissive ALL policies to auth.sessions for service_role
    - Add permissive ALL policies to auth.identities for service_role
    - Add minimum policies for authenticated access
*/

-- auth.users - allow all for service_role, owner access for authenticated
CREATE POLICY "Service role has full auth.users access" ON auth.users 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read their own auth record" ON auth.users 
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- auth.sessions - allow all for service_role
CREATE POLICY "Service role has full auth.sessions access" ON auth.sessions 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.identities - allow all for service_role
CREATE POLICY "Service role has full auth.identities access" ON auth.identities 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.audit_log_entries - allow all for service_role
CREATE POLICY "Service role has full audit log access" ON auth.audit_log_entries 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.flow_state - allow all for service_role
CREATE POLICY "Service role has full flow state access" ON auth.flow_state 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.mfa_challenges - allow all for service_role
CREATE POLICY "Service role has full mfa challenges access" ON auth.mfa_challenges 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.mfa_factors - allow all for service_role
CREATE POLICY "Service role has full mfa factors access" ON auth.mfa_factors 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.one_time_tokens - allow all for service_role
CREATE POLICY "Service role has full OTP access" ON auth.one_time_tokens 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- auth.refresh_tokens - allow all for service_role
CREATE POLICY "Service role has full refresh tokens access" ON auth.refresh_tokens 
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);