-- ============================================
-- FIX CRITICAL RLS ISSUES
-- ============================================

-- 1. FIX: live_chat_conversations - Remove overly permissive visitor policy
-- The current policy "Visitors can view their conversations" with (visitor_id IS NOT NULL) 
-- allows ANY visitor to see ALL conversations with any visitor_id set

DROP POLICY IF EXISTS "Visitors can view their conversations" ON public.live_chat_conversations;

-- Note: Visitors cannot use RLS with auth.uid() since they're not authenticated
-- The visitor pattern requires the frontend to pass visitor_id and we validate server-side
-- For now, visitors will interact via edge functions only (which use service role)


-- 2. FIX: live_chat_messages - Remove overly permissive visitor policy
-- Same issue - the policy allows any visitor to read all visitor messages

DROP POLICY IF EXISTS "Visitors can view their conversation messages" ON public.live_chat_messages;

-- Visitors will get their messages through the chat-ai edge function which uses service role


-- 3. FIX: promo_codes - Restrict to only allow checking specific codes, not browsing all
-- Current: Anyone can read active promo codes (allows competitors to see all discounts)
-- New: Only allow reading a specific code when provided (validation happens server-side)

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

-- Promo code validation will happen through edge functions with service role
-- No direct client access to promo_codes table for non-admins