/*
  # Create Auth Logs Table
  
  1. New Tables
    - `auth_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `event_type` (text: sign_up, sign_in, sign_out, mfa_verified, etc.)
      - `email` (text)
      - `ip_address` (text, optional)
      - `success` (boolean)
      - `error_message` (text, optional)
      - `metadata` (jsonb, optional)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `auth_logs` table
    - Add policy for users to read own logs
*/

CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email text,
  ip_address text,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth logs"
  ON auth_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
