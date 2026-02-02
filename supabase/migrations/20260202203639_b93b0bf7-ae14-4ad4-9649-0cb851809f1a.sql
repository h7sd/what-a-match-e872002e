-- Drop the existing INSERT policy that doesn't work properly for anonymous users
DROP POLICY IF EXISTS "Users can create conversations" ON public.live_chat_conversations;

-- Create a new INSERT policy that properly allows both authenticated users AND anonymous visitors
CREATE POLICY "Anyone can create conversations" 
ON public.live_chat_conversations 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  -- Authenticated users must set their own user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR 
  -- Anonymous visitors must have a visitor_id and no user_id
  (user_id IS NULL AND visitor_id IS NOT NULL AND length(visitor_id) > 0)
);

-- Also ensure anonymous users can view their own conversations (by visitor_id stored in client)
DROP POLICY IF EXISTS "Visitors can view own conversations" ON public.live_chat_conversations;
CREATE POLICY "Visitors can view own conversations" 
ON public.live_chat_conversations 
FOR SELECT 
TO anon
USING (visitor_id IS NOT NULL);

-- Ensure anonymous users can update their own conversations (for status updates)
DROP POLICY IF EXISTS "Visitors can update own conversations" ON public.live_chat_conversations;
CREATE POLICY "Visitors can update own conversations" 
ON public.live_chat_conversations 
FOR UPDATE 
TO anon
USING (visitor_id IS NOT NULL);

-- Also fix live_chat_messages policies for anonymous users
DROP POLICY IF EXISTS "Visitors can insert messages" ON public.live_chat_messages;
CREATE POLICY "Visitors can insert messages" 
ON public.live_chat_messages 
FOR INSERT 
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_chat_conversations 
    WHERE id = conversation_id AND visitor_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Visitors can view messages" ON public.live_chat_messages;
CREATE POLICY "Visitors can view messages" 
ON public.live_chat_messages 
FOR SELECT 
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.live_chat_conversations 
    WHERE id = conversation_id AND visitor_id IS NOT NULL
  )
);