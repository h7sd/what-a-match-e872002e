-- Create table for saved webhooks
CREATE TABLE public.admin_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_webhooks ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhooks
CREATE POLICY "Admins can view all webhooks"
ON public.admin_webhooks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create webhooks
CREATE POLICY "Admins can create webhooks"
ON public.admin_webhooks
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update webhooks
CREATE POLICY "Admins can update webhooks"
ON public.admin_webhooks
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete webhooks
CREATE POLICY "Admins can delete webhooks"
ON public.admin_webhooks
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));