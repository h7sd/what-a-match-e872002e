-- Create alias_requests table for tracking alias transfer requests
CREATE TABLE public.alias_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  requested_alias TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_token UUID DEFAULT gen_random_uuid()
);

-- Enable RLS
ALTER TABLE public.alias_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own requests
CREATE POLICY "Users can view their own sent requests"
ON public.alias_requests FOR SELECT
USING (auth.uid() = requester_id);

-- Target users can view requests sent to them
CREATE POLICY "Users can view requests sent to them"
ON public.alias_requests FOR SELECT
USING (auth.uid() = target_user_id);

-- Users can create requests
CREATE POLICY "Users can create alias requests"
ON public.alias_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Target users can update (respond to) requests
CREATE POLICY "Target users can respond to requests"
ON public.alias_requests FOR UPDATE
USING (auth.uid() = target_user_id);

-- Requesters can delete their pending requests
CREATE POLICY "Requesters can cancel pending requests"
ON public.alias_requests FOR DELETE
USING (auth.uid() = requester_id AND status = 'pending');

-- Create index for faster lookups
CREATE INDEX idx_alias_requests_target ON public.alias_requests(target_user_id, status);
CREATE INDEX idx_alias_requests_requester ON public.alias_requests(requester_id);
CREATE INDEX idx_alias_requests_token ON public.alias_requests(response_token);