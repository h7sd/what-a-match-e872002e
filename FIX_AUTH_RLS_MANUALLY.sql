-- ========================================
-- MANUAL FIX: Disable RLS on auth.users
-- ========================================
--
-- PROBLEM: RLS is enabled on auth.users, causing authentication to fail
-- SOLUTION: Disable RLS and remove all custom policies from auth.* tables
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Paste this entire file
-- 5. Run it
--
-- ========================================

-- Drop all custom policies from auth.users
DROP POLICY IF EXISTS "Anon role can access auth.users" ON auth.users;
DROP POLICY IF EXISTS "Authenticated users can read their own auth record" ON auth.users;
DROP POLICY IF EXISTS "Service role has full auth.users access" ON auth.users;

-- Drop policies from other auth tables
DROP POLICY IF EXISTS "Anon role can access auth.identities" ON auth.identities;
DROP POLICY IF EXISTS "Service role has full auth.identities access" ON auth.identities;

DROP POLICY IF EXISTS "Anon role can access auth.sessions" ON auth.sessions;
DROP POLICY IF EXISTS "Service role has full auth.sessions access" ON auth.sessions;

DROP POLICY IF EXISTS "Anon role can access auth.mfa_factors" ON auth.mfa_factors;
DROP POLICY IF EXISTS "Service role has full mfa factors access" ON auth.mfa_factors;

DROP POLICY IF EXISTS "Anon role can access auth.mfa_challenges" ON auth.mfa_challenges;
DROP POLICY IF EXISTS "Service role has full mfa challenges access" ON auth.mfa_challenges;

DROP POLICY IF EXISTS "Anon role can access auth.one_time_tokens" ON auth.one_time_tokens;
DROP POLICY IF EXISTS "Service role has full OTP access" ON auth.one_time_tokens;

DROP POLICY IF EXISTS "Anon role can access auth.refresh_tokens" ON auth.refresh_tokens;
DROP POLICY IF EXISTS "Service role has full refresh tokens access" ON auth.refresh_tokens;

DROP POLICY IF EXISTS "Anon role can access auth.audit_log_entries" ON auth.audit_log_entries;
DROP POLICY IF EXISTS "Service role has full audit log access" ON auth.audit_log_entries;

DROP POLICY IF EXISTS "Anon role can access auth.flow_state" ON auth.flow_state;
DROP POLICY IF EXISTS "Service role has full flow state access" ON auth.flow_state;

-- Disable RLS on all auth tables (Supabase Auth manages security internally)
ALTER TABLE IF EXISTS auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.mfa_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.flow_state DISABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS has been disabled on auth.* tables. Authentication should now work!' AS status;
