-- Run this in the Supabase SQL Editor for project ksejlspyueghbrhgoqtd
-- This creates the verification_codes table needed for password reset + signup verification

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Add type constraint (drop first in case it exists with wrong values)
ALTER TABLE public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_check;
ALTER TABLE public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_valid;
ALTER TABLE public.verification_codes
  ADD CONSTRAINT verification_codes_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'signup'::text,
        'password_reset'::text,
        'email_verification'::text,
        'email_change'::text,
        'account_deletion'::text,
        'delete_account'::text,
        'mfa_setup'::text,
        'mfa_email'::text
      ]
    )
  );

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_type ON public.verification_codes(email, type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- 4. Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Allow insert for service role" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow select for verification" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow update for marking used" ON public.verification_codes;

CREATE POLICY "Allow insert for service role"
ON public.verification_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for verification"
ON public.verification_codes FOR SELECT USING (true);

CREATE POLICY "Allow update for marking used"
ON public.verification_codes FOR UPDATE USING (true);

-- 6. Cleanup function for expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$;
