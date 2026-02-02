-- Create a secure view for alias_requests that hides the response_token
-- The token should only be accessible via edge functions with service role
CREATE OR REPLACE VIEW public.alias_requests_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  requested_alias,
  requester_id,
  target_user_id,
  status,
  responded_at,
  created_at
  -- response_token is intentionally excluded
FROM public.alias_requests;

-- Grant access to the view
GRANT SELECT ON public.alias_requests_safe TO authenticated;

-- Create a function for requesters to view their sent requests without token
CREATE OR REPLACE FUNCTION public.get_my_sent_alias_requests()
RETURNS TABLE (
  id uuid,
  requested_alias text,
  requester_id uuid,
  target_user_id uuid,
  status text,
  responded_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    requested_alias,
    requester_id,
    target_user_id,
    status,
    responded_at,
    created_at
  FROM public.alias_requests
  WHERE requester_id = auth.uid();
$$;

-- Create a function for target users to view requests sent to them (also without token)
-- The token is only needed by the edge function via email links
CREATE OR REPLACE FUNCTION public.get_alias_requests_for_me()
RETURNS TABLE (
  id uuid,
  requested_alias text,
  requester_id uuid,
  target_user_id uuid,
  status text,
  responded_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    requested_alias,
    requester_id,
    target_user_id,
    status,
    responded_at,
    created_at
  FROM public.alias_requests
  WHERE target_user_id = auth.uid();
$$;