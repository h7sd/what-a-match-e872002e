-- Function to return all stolen badges when an event is deactivated
CREATE OR REPLACE FUNCTION public.return_badges_on_event_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when is_active changes from true to false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Return all unreturned badges from this event
    UPDATE public.badge_steals
    SET returned = true, returned_at = now()
    WHERE event_id = NEW.id
      AND returned = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger that fires when badge_events is updated
DROP TRIGGER IF EXISTS on_event_deactivation ON public.badge_events;

CREATE TRIGGER on_event_deactivation
  AFTER UPDATE ON public.badge_events
  FOR EACH ROW
  EXECUTE FUNCTION public.return_badges_on_event_deactivation();