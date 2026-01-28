-- Drop the existing check constraint
ALTER TABLE public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_check;

-- Add a new check constraint that includes all used types plus account_deletion
ALTER TABLE public.verification_codes ADD CONSTRAINT verification_codes_type_check 
CHECK (type IN ('email_verification', 'password_reset', 'signup', 'account_deletion'));