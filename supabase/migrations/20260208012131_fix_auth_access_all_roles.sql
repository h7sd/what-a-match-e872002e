/*
  # Fix auth schema access for all required roles

  GoTrue needs access via multiple roles during the authentication flow.
  Adding permissive policies for anon role which is used during login.

  1. Changes
    - Add permissive ALL policies for anon role on all auth tables
    - Keep service_role policies
    - This allows the auth token endpoint to function
*/

-- Add anon role access for users table (needed for login)
CREATE POLICY "Anon role can access auth.users" ON auth.users 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for identities
CREATE POLICY "Anon role can access auth.identities" ON auth.identities 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for sessions
CREATE POLICY "Anon role can access auth.sessions" ON auth.sessions 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for mfa_factors
CREATE POLICY "Anon role can access auth.mfa_factors" ON auth.mfa_factors 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for mfa_challenges
CREATE POLICY "Anon role can access auth.mfa_challenges" ON auth.mfa_challenges 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for one_time_tokens
CREATE POLICY "Anon role can access auth.one_time_tokens" ON auth.one_time_tokens 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for refresh_tokens
CREATE POLICY "Anon role can access auth.refresh_tokens" ON auth.refresh_tokens 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for audit_log_entries
CREATE POLICY "Anon role can access auth.audit_log_entries" ON auth.audit_log_entries 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add anon role access for flow_state
CREATE POLICY "Anon role can access auth.flow_state" ON auth.flow_state 
  AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);