/*
  # Fix auth_logs Foreign Key Issue
  
  1. Changes
    - Remove foreign key constraint from auth_logs.user_id to auth.users.id
    - This prevents 500 errors when anon users try to log auth events
    
  2. Security
    - RLS policies remain in place to protect data
    - Only necessary change to fix authentication errors
*/

-- Remove the foreign key constraint that causes issues with anon role
ALTER TABLE IF EXISTS public.auth_logs
DROP CONSTRAINT IF EXISTS auth_logs_user_id_fkey;
