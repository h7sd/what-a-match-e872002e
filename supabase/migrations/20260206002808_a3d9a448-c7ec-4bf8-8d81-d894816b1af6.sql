-- Fix function search path
CREATE OR REPLACE FUNCTION public.trigger_bot_command_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.bot_command_notifications (action, command_name, changes)
    VALUES ('created', NEW.name, jsonb_build_object(
      'description', COALESCE(NEW.description, 'None'),
      'category', COALESCE(NEW.category, 'general'),
      'usage', COALESCE(NEW.usage, 'None')
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.bot_command_notifications (action, command_name, changes)
    VALUES ('updated', OLD.name, jsonb_build_object(
      'description', NEW.description,
      'category', NEW.category,
      'is_enabled', NEW.is_enabled
    ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.bot_command_notifications (action, command_name, changes)
    VALUES ('deleted', OLD.name, NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;