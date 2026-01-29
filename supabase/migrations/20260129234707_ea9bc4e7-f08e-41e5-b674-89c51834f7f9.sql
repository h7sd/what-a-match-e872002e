-- Create badge_requests table for custom badge requests
CREATE TABLE public.badge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_name text NOT NULL,
  badge_description text,
  badge_color text NOT NULL DEFAULT '#8B5CF6',
  badge_icon_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  denial_reason text,
  admin_edited_name text,
  admin_edited_description text,
  admin_edited_color text,
  admin_edited_icon_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  CONSTRAINT one_request_per_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.badge_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own badge requests"
ON public.badge_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own request (only one allowed via constraint)
CREATE POLICY "Users can create their own badge request"
ON public.badge_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending request (to re-submit after denial)
CREATE POLICY "Users can update their own pending request"
ON public.badge_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'denied');

-- Users can delete their own request
CREATE POLICY "Users can delete their own badge request"
ON public.badge_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all badge requests"
ON public.badge_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any request (for approval/denial)
CREATE POLICY "Admins can update any badge request"
ON public.badge_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));