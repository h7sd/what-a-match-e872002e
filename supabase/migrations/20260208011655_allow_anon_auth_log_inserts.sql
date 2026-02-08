/*
  # Allow anonymous auth log inserts for failed login attempts

  Failed login attempts happen before authentication, so the user
  is anonymous. Allow anon to insert logs with null user_id.

  1. Changes
    - Add INSERT policy for anon role on auth_logs with null user_id
*/

CREATE POLICY "Anon can insert auth logs without user_id"
  ON auth_logs FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);