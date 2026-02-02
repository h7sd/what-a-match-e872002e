import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin' | 'ai';
  created_at: string;
}

interface AgentInfo {
  display_name: string | null;
  username: string;
  avatar_url: string | null;
}

export function LiveChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai' | 'agent'>('ai');
  const [agentRequested, setAgentRequested] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          // Only add if it's from admin (agents) - AI and user messages are added locally
          if (newMessage.sender_type === 'admin') {
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, {
                id: newMessage.id,
                content: newMessage.message,
                sender_type: newMessage.sender_type,
                created_at: newMessage.created_at,
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Detect when a live agent takes over, and stop AI replies.
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_conversations',
          filter: `id=eq.${conversationId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          if (updated?.assigned_admin_id && !agentInfo) {
            setAgentRequested(true);
            setMode('agent');
            
            // Load agent profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', updated.assigned_admin_id)
              .maybeSingle();
            
            if (profile) {
              setAgentInfo(profile);
            }
            
            setMessages(prev => {
              if (prev.some(m => m.id === 'agent_connected')) return prev;
              return [...prev, {
                id: 'agent_connected',
                content: `${profile?.display_name || profile?.username || 'A support agent'} has joined the chat.`,
                sender_type: 'ai',
                created_at: new Date().toISOString(),
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, agentInfo]);

  const initConversation = async () => {
    try {
      const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('live_chat_conversations')
        .insert({
          user_id: user?.id || null,
          visitor_id: user ? null : visitorId,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      setConversationId(data.id);

      // Add welcome message
      setMessages([{
        id: 'welcome',
        content: "Hey! 👋 Willkommen beim UserVault Support! Ich bin dein KI-Assistent und helfe dir gerne weiter. Was kann ich für dich tun?",
        sender_type: 'ai',
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message locally
    const userMsgId = `user_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userMessage,
      sender_type: 'user',
      created_at: new Date().toISOString(),
    }]);

    // Save to database
    await supabase.from('live_chat_messages').insert({
      conversation_id: conversationId,
      sender_type: 'user',
      sender_id: user?.id || null,
      message: userMessage,
    });

    // Check if user wants to talk to an agent
    const wantsAgent = /agent|human|person|real person|support team|live support/i.test(userMessage);
    
    if (wantsAgent || agentRequested) {
      if (!agentRequested) {
        setAgentRequested(true);
        setMode('agent');
        
        setMessages(prev => [...prev, {
          id: `system_${Date.now()}`,
          content: "I'm connecting you with a live support agent. Please wait a moment, someone will be with you shortly!",
          sender_type: 'ai',
          created_at: new Date().toISOString(),
        }]);

        // Update conversation to request agent
        await supabase.from('live_chat_conversations')
          .update({ status: 'waiting_for_agent' })
          .eq('id', conversationId);
      }
      return;
    }

    // Get AI response
    setIsLoading(true);
    try {
      const chatMessages = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));
      
      chatMessages.push({ role: 'user', content: userMessage });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatMessages, conversationId }),
      });

      if (!response.ok) {
        // If a human agent took over, the AI function returns 409.
        if (response.status === 409) {
          setAgentRequested(true);
          setMode('agent');
          setMessages(prev => [...prev, {
            id: `system_${Date.now()}`,
            content: "A live agent is handling this chat now. Please wait for their reply.",
            sender_type: 'ai',
            created_at: new Date().toISOString(),
          }]);
          return;
        }
        throw new Error('Failed to get AI response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      const aiMsgId = `ai_${Date.now()}`;
      
      // Add placeholder for AI message
      setMessages(prev => [...prev, {
        id: aiMsgId,
        content: '',
        sender_type: 'ai',
        created_at: new Date().toISOString(),
      }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (!line.startsWith('data: ') || line.trim() === '') continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
                setMessages(prev => prev.map(m => 
                  m.id === aiMsgId ? { ...m, content: aiResponse } : m
                ));
              }
            } catch { /* ignore */ }
          }
        }
      }

      // Save AI response to database
      if (aiResponse) {
        await supabase.from('live_chat_messages').insert({
          conversation_id: conversationId,
          sender_type: 'ai',
          message: aiResponse,
        });
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        content: "Sorry, I'm having trouble responding right now. Would you like to speak with a live agent?",
        sender_type: 'ai',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[500px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {mode === 'agent' && agentInfo ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={agentInfo.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20">
                {(agentInfo.display_name || agentInfo.username)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              {mode === 'ai' ? (
                <Bot className="w-5 h-5 text-primary" />
              ) : (
                <Users className="w-5 h-5 text-primary" />
              )}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {mode === 'agent' && agentInfo
                ? agentInfo.display_name || agentInfo.username
                : mode === 'ai' 
                  ? 'AI Support' 
                  : 'Live Support'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {mode === 'ai' 
                ? 'Powered by AI' 
                : agentInfo 
                  ? 'Support Agent' 
                  : 'Waiting for agent...'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender_type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                msg.sender_type === 'user' 
                  ? 'bg-primary' 
                  : msg.sender_type === 'admin'
                    ? 'bg-green-500/20'
                    : 'bg-secondary'
              }`}>
                {msg.sender_type === 'user' ? (
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                ) : msg.sender_type === 'admin' ? (
                  agentInfo?.avatar_url ? (
                    <img src={agentInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-green-500" />
                  )
                ) : (
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                msg.sender_type === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-secondary rounded-tl-sm'
              }`}>
                {msg.content || <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="bg-secondary p-3 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputText.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
