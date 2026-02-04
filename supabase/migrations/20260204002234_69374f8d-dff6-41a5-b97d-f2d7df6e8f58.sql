-- Create table for Discord roles to tag
CREATE TABLE public.admin_discord_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_id TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_discord_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles
CREATE POLICY "Admins can view all discord roles"
ON public.admin_discord_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create discord roles"
ON public.admin_discord_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete discord roles"
ON public.admin_discord_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add notification_type to webhooks table
ALTER TABLE public.admin_webhooks 
ADD COLUMN notification_type TEXT NOT NULL DEFAULT 'changelog';

-- Add comment for clarity
COMMENT ON COLUMN public.admin_webhooks.notification_type IS 'Type: changelog (admin) or announce (global)';