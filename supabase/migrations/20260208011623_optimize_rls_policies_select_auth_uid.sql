/*
  # Optimize RLS policies to use (select auth.uid())

  Performance fix: Wrapping auth.uid() in (select ...) prevents
  re-evaluation per row, improving query performance at scale.

  1. Changes
    - `auth_logs`: "Users can view own auth logs" - optimize USING clause
    - `profiles`: "Users can create own profile" - optimize WITH CHECK
    - `profiles`: "Users can update own profile" - optimize USING + WITH CHECK
    - `profiles`: "Users can delete own profile" - optimize USING clause

  2. Security
    - Replace unrestricted INSERT on `auth_logs` with authenticated-only policy
*/

-- auth_logs: optimize SELECT policy
DROP POLICY IF EXISTS "Users can view own auth logs" ON auth_logs;
CREATE POLICY "Users can view own auth logs"
  ON auth_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- auth_logs: replace unrestricted INSERT with scoped policy
DROP POLICY IF EXISTS "Anyone can insert auth logs" ON auth_logs;
CREATE POLICY "Authenticated users can insert own auth logs"
  ON auth_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Service role can insert auth logs"
  ON auth_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- profiles: optimize INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- profiles: optimize UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- profiles: optimize DELETE policy
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);