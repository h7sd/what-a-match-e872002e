
-- Create function to randomly assign hunt badge when event activates
CREATE OR REPLACE FUNCTION public.assign_hunt_badge_on_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_random_user_id uuid;
  v_existing_enabled_count int;
BEGIN
  -- Only trigger when a hunt event becomes active
  IF NEW.event_type = 'hunt' 
     AND NEW.is_active = true 
     AND (OLD.is_active = false OR OLD.is_active IS NULL)
     AND NEW.target_badge_id IS NOT NULL THEN
    
    -- Check if anyone already has this badge enabled
    SELECT COUNT(*) INTO v_existing_enabled_count
    FROM user_badges
    WHERE badge_id = NEW.target_badge_id AND is_enabled = true;
    
    -- If no one has it enabled, pick a random user who HAS the badge and enable it for them
    IF v_existing_enabled_count = 0 THEN
      -- Pick a random user who owns this badge
      SELECT user_id INTO v_random_user_id
      FROM user_badges
      WHERE badge_id = NEW.target_badge_id
      ORDER BY random()
      LIMIT 1;
      
      -- If found, enable the badge for that user
      IF v_random_user_id IS NOT NULL THEN
        UPDATE user_badges
        SET is_enabled = true
        WHERE badge_id = NEW.target_badge_id AND user_id = v_random_user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for hunt badge assignment
DROP TRIGGER IF EXISTS on_hunt_event_activation ON badge_events;
CREATE TRIGGER on_hunt_event_activation
  AFTER UPDATE ON badge_events
  FOR EACH ROW
  EXECUTE FUNCTION assign_hunt_badge_on_activation();

-- Also handle INSERT for new events created as active
DROP TRIGGER IF EXISTS on_hunt_event_insert ON badge_events;
CREATE TRIGGER on_hunt_event_insert
  AFTER INSERT ON badge_events
  FOR EACH ROW
  WHEN (NEW.is_active = true AND NEW.event_type = 'hunt')
  EXECUTE FUNCTION assign_hunt_badge_on_activation();
