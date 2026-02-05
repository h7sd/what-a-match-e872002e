-- Create table for Discord bot verification codes
CREATE TABLE public.discord_bot_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  discord_user_id TEXT
);

-- Enable RLS
ALTER TABLE public.discord_bot_verification ENABLE ROW LEVEL SECURITY;

-- Users can view and delete their own codes
CREATE POLICY "Users can view their own verification codes"
ON public.discord_bot_verification FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verification codes"
ON public.discord_bot_verification FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_discord_bot_verification_code ON public.discord_bot_verification(code);
CREATE INDEX idx_discord_bot_verification_user ON public.discord_bot_verification(user_id);

-- Function to cleanup expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_discord_bot_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.discord_bot_verification WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;