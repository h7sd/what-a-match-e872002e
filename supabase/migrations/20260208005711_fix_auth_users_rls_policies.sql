/*
  # Fix Auth Users RLS Policies
  
  1. Problem
    - The auth.users table has RLS enabled but insufficient policies
    - Foreign key constraints from profiles and other tables reference auth.users
    - During login, Supabase Auth cannot validate foreign key constraints
    - This causes "Database error querying schema" error
    
  2. Solution  
    - Drop any existing restrictive policies on auth.users
    - Create policies to allow authenticated and anon roles to read users
    - This allows foreign key constraint validation and auth operations
    
  3. Security
    - Allow reading user records for FK validation
    - Restrict modifications to service_role only
*/

-- Drop any existing policies that might be blocking access
DROP POLICY IF EXISTS "Service role can read users" ON auth.users;
DROP POLICY IF EXISTS "Service role can insert users" ON auth.users;
DROP POLICY IF EXISTS "Service role can update users" ON auth.users;
DROP POLICY IF EXISTS "Service role can delete users" ON auth.users;
DROP POLICY IF EXISTS "Users can read own data" ON auth.users;
DROP POLICY IF EXISTS "Anyone can read users" ON auth.users;

-- Allow authenticated and anonymous users to read from auth.users
-- This is needed for foreign key constraint validation
CREATE POLICY "Allow read access for FK validation"
  ON auth.users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own user data"
  ON auth.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());
