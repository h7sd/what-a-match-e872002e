-- Create secure RPC function for admin chat notifications
-- Only admins can call this function to get unread/waiting conversations

CREATE OR REPLACE FUNCTION public.get_admin_chat_notifications()
RETURNS TABLE(
  conversation_id uuid,
  visitor_display text,
  status text,
  last_message_at timestamp with time zone,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access this data
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    CASE 
      WHEN c.user_id IS NOT NULL THEN (
        SELECT COALESCE(p.display_name, p.username, 'User')
        FROM profiles p WHERE p.user_id = c.user_id LIMIT 1
      )
      ELSE 'Guest #' || RIGHT(COALESCE(c.visitor_id, 'unknown'), 6)
    END as visitor_display,
    c.status,
    c.updated_at as last_message_at,
    (
      SELECT COUNT(*) 
      FROM live_chat_messages m 
      WHERE m.conversation_id = c.id 
      AND m.sender_type IN ('user', 'visitor')
      AND m.created_at > COALESCE(
        (SELECT MAX(m2.created_at) FROM live_chat_messages m2 
         WHERE m2.conversation_id = c.id AND m2.sender_type = 'admin'),
        '1970-01-01'::timestamp
      )
    ) as unread_count
  FROM live_chat_conversations c
  WHERE c.status IN ('active', 'waiting_for_agent')
    AND (c.assigned_admin_id IS NULL OR c.assigned_admin_id = auth.uid())
  ORDER BY 
    CASE WHEN c.status = 'waiting_for_agent' THEN 0 ELSE 1 END,
    c.updated_at DESC
  LIMIT 20;
END;
$$;