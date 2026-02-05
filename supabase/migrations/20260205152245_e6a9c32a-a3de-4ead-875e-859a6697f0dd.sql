-- Fix conflicting verification_codes type constraints (blocks MFA + other flows)
ALTER TABLE public.verification_codes
  DROP CONSTRAINT IF EXISTS verification_codes_type_check;

ALTER TABLE public.verification_codes
  DROP CONSTRAINT IF EXISTS verification_codes_type_valid;

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
