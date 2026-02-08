/*
  # Fix Auth Logs and User Badges Relations
  
  1. Changes to auth_logs
    - Add INSERT policy so users can log authentication events
    
  2. Changes to user_badges
    - Ensure foreign key constraint exists between user_badges and global_badges
    
  3. Security
    - Maintain restrictive RLS policies
    - Only allow users to insert their own auth logs
*/

-- Add INSERT policy for auth_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'auth_logs' 
    AND policyname = 'Users can insert own auth logs'
  ) THEN
    CREATE POLICY "Users can insert own auth logs"
      ON auth_logs FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure foreign key constraint exists for user_badges -> global_badges
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'user_badges'
      AND kcu.column_name = 'badge_id'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE user_badges 
    ADD CONSTRAINT user_badges_badge_id_fkey 
    FOREIGN KEY (badge_id) 
    REFERENCES global_badges(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
