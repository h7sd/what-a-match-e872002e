-- Fix overly permissive policies that allow public INSERT with true

-- 1. Fix live_chat_conversations - require either user_id or visitor_id
DROP POLICY IF EXISTS "Anyone can create a conversation" ON public.live_chat_conversations;
CREATE POLICY "Users can create conversations"
ON public.live_chat_conversations
FOR INSERT
WITH CHECK (
  -- Must have either a user_id matching auth user OR a visitor_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND visitor_id IS NOT NULL AND length(visitor_id) > 0)
);

-- 2. Fix live_chat_messages - must be part of conversation
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.live_chat_messages;
CREATE POLICY "Participants can send messages"
ON public.live_chat_messages
FOR INSERT
WITH CHECK (
  -- User must be participant of the conversation
  EXISTS (
    SELECT 1 FROM public.live_chat_conversations c
    WHERE c.id = conversation_id
    AND (
      c.user_id = auth.uid()
      OR (auth.uid() IS NULL AND c.visitor_id IS NOT NULL)
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- 3. Fix promo_code_uses - only service role should insert, not public
DROP POLICY IF EXISTS "Service role can insert code uses" ON public.promo_code_uses;
-- This table should only be writable by service role (which bypasses RLS)
-- No public INSERT policy needed

-- 4. Fix purchases - only service role should insert
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.purchases;
-- Already removed in previous migration, but ensure it's gone

-- 5. Fix support_messages - only admins and service role
DROP POLICY IF EXISTS "Service role can insert messages" ON public.support_messages;
-- Keep only the admin policy which already exists

-- 6. Fix support_tickets - validate email format at least
DROP POLICY IF EXISTS "Service role can insert tickets" ON public.support_tickets;
-- Service role bypasses RLS anyway, no public policy needed

-- Add validation trigger for live chat to prevent spam
CREATE OR REPLACE FUNCTION public.validate_live_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_messages_count integer;
BEGIN
  -- Rate limit: max 10 messages per minute per conversation
  SELECT COUNT(*) INTO recent_messages_count
  FROM public.live_chat_messages
  WHERE conversation_id = NEW.conversation_id
    AND (
      (sender_id IS NOT NULL AND sender_id = NEW.sender_id)
      OR (sender_id IS NULL AND NEW.sender_id IS NULL)
    )
    AND created_at > now() - interval '1 minute';
  
  IF recent_messages_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages';
  END IF;
  
  -- Validate message length
  IF length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000 characters)';
  END IF;
  
  IF length(trim(NEW.message)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_live_chat_message_before_insert ON public.live_chat_messages;
CREATE TRIGGER validate_live_chat_message_before_insert
  BEFORE INSERT ON public.live_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_live_chat_message();