-- Drop old complex policies if they exist
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.admin_notifications;