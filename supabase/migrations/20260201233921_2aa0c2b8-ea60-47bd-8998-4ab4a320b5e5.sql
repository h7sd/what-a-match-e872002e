-- Create live chat conversations table
CREATE TABLE public.live_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live chat messages table
CREATE TABLE public.live_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.live_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'user', 'admin', 'ai'
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Admins can view all conversations"
ON public.live_chat_conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage conversations"
ON public.live_chat_conversations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own conversations"
ON public.live_chat_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create a conversation"
ON public.live_chat_conversations
FOR INSERT
WITH CHECK (true);

-- RLS policies for messages
CREATE POLICY "Admins can view all messages"
ON public.live_chat_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert messages"
ON public.live_chat_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their conversation messages"
ON public.live_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to their conversations"
ON public.live_chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_chat_conversations c
    WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.visitor_id IS NOT NULL)
  )
);

CREATE POLICY "Service role can manage messages"
ON public.live_chat_messages
FOR ALL
USING (true);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_conversations;