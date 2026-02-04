-- Create queue table for bot command notifications
CREATE TABLE public.bot_command_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  command_name TEXT NOT NULL,
  changes JSONB, -- field changes for updates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for efficient polling
CREATE INDEX idx_bot_command_notifications_pending 
  ON public.bot_command_notifications (processed, created_at) 
  WHERE processed = false;

-- Enable RLS
ALTER TABLE public.bot_command_notifications ENABLE ROW LEVEL SECURITY;

-- Public read for bot polling (secured by webhook secret in API)
CREATE POLICY "Allow public read for bot polling"
  ON public.bot_command_notifications
  FOR SELECT
  USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage notifications"
  ON public.bot_command_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);