-- Create table for bot commands (live API + webhook notifications)
CREATE TABLE public.bot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  usage TEXT,
  category TEXT DEFAULT 'general',
  is_enabled BOOLEAN DEFAULT true,
  cooldown_seconds INTEGER DEFAULT 0,
  required_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;

-- Public read access (for bots/external systems)
CREATE POLICY "Anyone can read commands"
ON public.bot_commands
FOR SELECT
USING (true);

-- Admin write access
CREATE POLICY "Admins can manage commands"
ON public.bot_commands
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE TRIGGER update_bot_commands_updated_at
BEFORE UPDATE ON public.bot_commands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();