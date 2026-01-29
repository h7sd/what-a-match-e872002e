-- Fix: Unrestricted Badge Claiming - Users should NOT be able to claim badges themselves
-- Badges are admin-assigned only per the system design

-- Drop the policy that allows users to claim badges
DROP POLICY IF EXISTS "Users can claim badges" ON user_badges;

-- Create a trigger function to validate badge claims
-- This ensures only admins can insert badges (via admin-update-profile edge function)
CREATE OR REPLACE FUNCTION validate_badge_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record RECORD;
  is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT has_role(auth.uid(), 'admin') INTO is_admin;
  
  -- If not called by admin (via service role/edge function), reject
  -- auth.uid() will be null when called from service role
  IF auth.uid() IS NOT NULL AND NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can assign badges';
  END IF;
  
  -- Get badge details for validation
  SELECT * INTO badge_record
  FROM global_badges
  WHERE id = NEW.badge_id;
  
  IF badge_record IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;
  
  -- Check if limited badge and at capacity
  IF badge_record.is_limited AND badge_record.max_claims IS NOT NULL THEN
    IF badge_record.claims_count >= badge_record.max_claims THEN
      RAISE EXCEPTION 'Badge claim limit reached';
    END IF;
  END IF;
  
  -- Increment claims count atomically
  UPDATE global_badges
  SET claims_count = COALESCE(claims_count, 0) + 1
  WHERE id = NEW.badge_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for badge claim validation
DROP TRIGGER IF EXISTS validate_badge_claim_trigger ON user_badges;
CREATE TRIGGER validate_badge_claim_trigger
BEFORE INSERT ON user_badges
FOR EACH ROW
EXECUTE FUNCTION validate_badge_claim();

-- Also create a function to decrement claims count when badge is removed
CREATE OR REPLACE FUNCTION decrement_badge_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE global_badges
  SET claims_count = GREATEST(COALESCE(claims_count, 0) - 1, 0)
  WHERE id = OLD.badge_id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for badge removal
DROP TRIGGER IF EXISTS decrement_badge_claims_trigger ON user_badges;
CREATE TRIGGER decrement_badge_claims_trigger
BEFORE DELETE ON user_badges
FOR EACH ROW
EXECUTE FUNCTION decrement_badge_claims();