/*
  # Fix Profiles and Auth Logs RLS Policies
  
  1. Changes to profiles table
    - Add SELECT policy: everyone can view profiles (public profiles)
    - Add INSERT policy: authenticated users can create their own profile
    - Add UPDATE policy: authenticated users can update their own profile
    - Add DELETE policy: authenticated users can delete their own profile
    
  2. Changes to auth_logs table
    - Drop existing INSERT policy
    - Add new INSERT policy that allows both authenticated and anonymous users
    - This allows logging of failed login attempts before authentication
    
  3. Security
    - Profiles are publicly viewable (required for profile pages)
    - Users can only modify their own profiles
    - Auth logs can be created by anyone (needed for login tracking)
    - Users can only view their own auth logs
*/

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- SELECT: Everyone can view profiles (public profiles feature)
CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Authenticated users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Authenticated users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- AUTH_LOGS TABLE POLICIES
-- ============================================

-- Drop existing INSERT policy that was too restrictive
DROP POLICY IF EXISTS "Users can insert own auth logs" ON auth_logs;

-- INSERT: Allow both authenticated and anonymous users to create logs
-- This is necessary for logging failed login attempts
-- We use anon role for pre-authentication events
CREATE POLICY "Anyone can insert auth logs"
  ON auth_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Note: The SELECT policy "Users can view own auth logs" remains unchanged
-- It restricts viewing to authenticated users seeing only their own logs
