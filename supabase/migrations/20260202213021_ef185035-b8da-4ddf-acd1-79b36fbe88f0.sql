-- Drop the unused alias_requests_safe view
-- The frontend now uses secure RPC functions: get_my_sent_alias_requests() and get_alias_requests_for_me()
DROP VIEW IF EXISTS public.alias_requests_safe;