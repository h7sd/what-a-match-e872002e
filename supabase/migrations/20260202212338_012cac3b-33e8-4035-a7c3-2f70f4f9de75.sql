-- Add secure session token for visitor conversations
ALTER TABLE public.live_chat_conversations 
ADD COLUMN IF NOT EXISTS visitor_session_token uuid DEFAULT gen_random_uuid();

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_live_chat_visitor_token 
ON public.live_chat_conversations(visitor_session_token) 
WHERE visitor_id IS NOT NULL;

-- Drop the insecure visitor policies
DROP POLICY IF EXISTS "Visitors can view own conversations" ON public.live_chat_conversations;
DROP POLICY IF EXISTS "Visitors can update own conversations" ON public.live_chat_conversations;

-- Drop the insecure visitor message policies  
DROP POLICY IF EXISTS "Visitors can insert messages" ON public.live_chat_messages;
DROP POLICY IF EXISTS "Visitors can view messages" ON public.live_chat_messages;

-- Create secure function to get visitor conversation by token
CREATE OR REPLACE FUNCTION public.get_visitor_conversation(p_session_token uuid)
RETURNS TABLE (
  id uuid,
  visitor_id text,
  status text,
  assigned_admin_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    visitor_id,
    status,
    assigned_admin_id,
    created_at,
    updated_at
  FROM public.live_chat_conversations
  WHERE visitor_session_token = p_session_token
    AND visitor_id IS NOT NULL
  LIMIT 1;
$$;

-- Create secure function to get messages by session token
CREATE OR REPLACE FUNCTION public.get_visitor_messages(p_session_token uuid)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  message text,
  sender_type text,
  sender_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.conversation_id,
    m.message,
    m.sender_type,
    m.sender_id,
    m.created_at
  FROM public.live_chat_messages m
  INNER JOIN public.live_chat_conversations c ON c.id = m.conversation_id
  WHERE c.visitor_session_token = p_session_token
    AND c.visitor_id IS NOT NULL
  ORDER BY m.created_at ASC;
$$;

-- Create secure function to send visitor message
CREATE OR REPLACE FUNCTION public.send_visitor_message(
  p_session_token uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_message_id uuid;
BEGIN
  -- Get conversation by session token
  SELECT id INTO v_conversation_id
  FROM public.live_chat_conversations
  WHERE visitor_session_token = p_session_token
    AND visitor_id IS NOT NULL
    AND status != 'closed';
  
  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session or conversation closed';
  END IF;
  
  -- Rate limit check (10 messages per minute)
  IF (
    SELECT COUNT(*) 
    FROM public.live_chat_messages 
    WHERE conversation_id = v_conversation_id 
      AND sender_type = 'visitor'
      AND created_at > now() - interval '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  
  -- Validate message
  IF length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  
  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;
  
  -- Insert message
  INSERT INTO public.live_chat_messages (conversation_id, message, sender_type, sender_id)
  VALUES (v_conversation_id, trim(p_message), 'visitor', NULL)
  RETURNING id INTO v_message_id;
  
  -- Update conversation timestamp
  UPDATE public.live_chat_conversations
  SET updated_at = now()
  WHERE id = v_conversation_id;
  
  RETURN v_message_id;
END;
$$;

-- Create secure function to create visitor conversation (returns session token)
CREATE OR REPLACE FUNCTION public.create_visitor_conversation(p_visitor_id text)
RETURNS TABLE (
  conversation_id uuid,
  session_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_session_token uuid;
BEGIN
  -- Validate visitor_id
  IF p_visitor_id IS NULL OR length(trim(p_visitor_id)) < 10 THEN
    RAISE EXCEPTION 'Invalid visitor ID';
  END IF;
  
  -- Check for existing active conversation
  SELECT id, visitor_session_token INTO v_conversation_id, v_session_token
  FROM public.live_chat_conversations
  WHERE visitor_id = p_visitor_id
    AND status != 'closed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_conversation_id IS NOT NULL THEN
    RETURN QUERY SELECT v_conversation_id, v_session_token;
    RETURN;
  END IF;
  
  -- Generate secure session token
  v_session_token := gen_random_uuid();
  
  -- Create new conversation
  INSERT INTO public.live_chat_conversations (visitor_id, visitor_session_token, status)
  VALUES (p_visitor_id, v_session_token, 'active')
  RETURNING id INTO v_conversation_id;
  
  RETURN QUERY SELECT v_conversation_id, v_session_token;
END;
$$;