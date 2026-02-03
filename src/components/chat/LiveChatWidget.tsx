import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PUBLIC_API_URL } from '@/lib/supabase-proxy-client';

// Encryption utilities for chat
const ENCRYPTION_SECRET_PREFIX = 'uservault-chat-client';

async function deriveChatKey(identifier: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(`${ENCRYPTION_SECRET_PREFIX}:${identifier}:chat-encryption`);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = encoder.encode('uservault-chat-encryption-v1');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 50000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayload(payload: unknown, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify(payload));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptChunk(encryptedChunk: string, key: CryptoKey): Promise<string> {
  const [ivB64, dataB64] = encryptedChunk.split(':');
  if (!ivB64 || !dataB64) return '';
  
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const encryptedData = Uint8Array.from(atob(dataB64), c => c.charCodeAt(0));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin' | 'ai' | 'visitor';
  created_at: string;
}

interface AgentInfo {
  display_name: string | null;
  username: string;
  avatar_url: string | null;
}

// Secure session storage key
const SESSION_TOKEN_KEY = 'live_chat_session_token';
const CONVERSATION_ID_KEY = 'live_chat_conversation_id';

export function LiveChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai' | 'agent'>('ai');
  const [agentRequested, setAgentRequested] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentIsTyping, setAgentIsTyping] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const storedConvId = sessionStorage.getItem(CONVERSATION_ID_KEY);
    if (storedToken && storedConvId) {
      setSessionToken(storedToken);
      setConversationId(storedConvId);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    } else if (isOpen && conversationId && sessionToken && messages.length === 0) {
      // Load existing messages for returning visitors
      loadExistingMessages();
    }
  }, [isOpen, conversationId, sessionToken]);

  const loadExistingMessages = async () => {
    if (!sessionToken && !user) return;
    
    try {
      // First check if conversation is closed or assigned to an agent
      if (sessionToken) {
        const { data: convData } = await supabase.rpc('get_visitor_conversation', {
          p_session_token: sessionToken
        });
        
        if (convData && convData.length > 0) {
          const conv = convData[0];
          
          // If conversation is closed, start fresh
          if (conv.status === 'closed') {
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(CONVERSATION_ID_KEY);
            setConversationId(null);
            setSessionToken(null);
            setIsClosed(true);
            return;
          }
          
          // If an agent is assigned, switch to agent mode
          if (conv.assigned_admin_id) {
            setMode('agent');
            setAgentRequested(true);
            
            // Load agent profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', conv.assigned_admin_id)
              .maybeSingle();
            
            if (profile) {
              setAgentInfo(profile);
            }
          }
        }
      }
      
      let data;
      if (user) {
        // Authenticated users use direct query
        const result = await supabase
          .from('live_chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        data = result.data;
      } else if (sessionToken) {
        // Visitors use secure RPC function
        const result = await supabase.rpc('get_visitor_messages', { 
          p_session_token: sessionToken 
        });
        data = result.data;
      }
      
      if (data && data.length > 0) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          content: m.message,
          sender_type: m.sender_type,
          created_at: m.created_at,
        })));
      } else {
        // Add welcome message for empty conversations
        setMessages([{
          id: 'welcome',
          content: "Hey! 👋 Willkommen beim UserVault Support! Ich bin dein KI-Assistent und helfe dir gerne weiter. Was kann ich für dich tun?",
          sender_type: 'ai',
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

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
  }, [messages, agentIsTyping]);

  // Listen for agent typing via broadcast
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `typing-user-${conversationId}`;
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender === 'admin') {
          setAgentIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setAgentIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  // Send typing indicator - using a separate channel instance
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;
    const channelName = `typing-admin-${conversationId}`;
    const channel = supabase.channel(channelName);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: 'user' }
    });
  }, [conversationId]);

  // Detect when a live agent takes over OR when chat is closed
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
          
          // Check if chat was closed
          if (updated?.status === 'closed') {
            setIsClosed(true);
            // Clear session on close
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            sessionStorage.removeItem(CONVERSATION_ID_KEY);
            return;
          }
          
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
      if (user) {
        // Authenticated users - direct insert with RLS
        const { data, error } = await supabase
          .from('live_chat_conversations')
          .insert({
            user_id: user.id,
            visitor_id: null,
            status: 'active',
          })
          .select('id')
          .single();

        if (error) throw error;
        setConversationId(data.id);
      } else {
        // Anonymous visitors - use secure RPC function
        const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data, error } = await supabase.rpc('create_visitor_conversation', {
          p_visitor_id: visitorId
        });

        if (error) throw error;
        
        if (data && data[0]) {
          const { conversation_id, session_token } = data[0];
          setConversationId(conversation_id);
          setSessionToken(session_token);
          
          // Store securely in sessionStorage (cleared on browser close)
          sessionStorage.setItem(SESSION_TOKEN_KEY, session_token);
          sessionStorage.setItem(CONVERSATION_ID_KEY, conversation_id);
        }
      }
      
      setIsClosed(false);
      setMode('ai');
      setAgentRequested(false);
      setAgentInfo(null);

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

  const startNewChat = () => {
    // Clear stored session
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(CONVERSATION_ID_KEY);
    
    setConversationId(null);
    setSessionToken(null);
    setMessages([]);
    setInputText('');
    setIsClosed(false);
    setMode('ai');
    setAgentRequested(false);
    setAgentInfo(null);
    initConversation();
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message locally
    const userMsgId = `user_${Date.now()}`;
    const senderType = user ? 'user' : 'visitor';
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userMessage,
      sender_type: senderType,
      created_at: new Date().toISOString(),
    }]);

    // Save to database
    try {
      if (user) {
        // Authenticated users - direct insert
        await supabase.from('live_chat_messages').insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: user.id,
          message: userMessage,
        });
      } else if (sessionToken) {
        // Visitors - use secure RPC function
        await supabase.rpc('send_visitor_message', {
          p_session_token: sessionToken,
          p_message: userMessage
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return;
    }

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

        // Update conversation to request agent (only for authenticated users)
        if (user) {
          await supabase.from('live_chat_conversations')
            .update({ status: 'waiting_for_agent' })
            .eq('id', conversationId);
        }
      }
      return;
    }

    // Get AI response with encryption
    setIsLoading(true);
    try {
      const chatMessages = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender_type === 'user' || m.sender_type === 'visitor' ? 'user' : 'assistant',
          content: m.content,
        }));
      
      chatMessages.push({ role: 'user', content: userMessage });

      // Derive encryption key for this session
      const keyIdentifier = user?.id || sessionToken || 'anonymous';
      const encryptionKey = await deriveChatKey(keyIdentifier);
      
      // Encrypt the payload
      const payload = { 
        messages: chatMessages, 
        conversationId,
        sessionToken: sessionToken || undefined 
      };
      const encryptedPayload = await encryptPayload(payload, encryptionKey);

      // Use proxy URL to hide Supabase project ID
      const response = await fetch(`${PUBLIC_API_URL}/functions/v1/encrypted-chat-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-encrypted': 'true',
          'x-session-token': sessionToken || '',
        },
        body: JSON.stringify(encryptedPayload),
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

      // Check if response is encrypted
      const isEncryptedResponse = response.headers.get('x-encrypted') === 'true';
      
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
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              let jsonStr = dataStr;
              
              // Decrypt if encrypted
              if (isEncryptedResponse && dataStr.includes(':')) {
                jsonStr = await decryptChunk(dataStr, encryptionKey);
              }
              
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
                setMessages(prev => prev.map(m => 
                  m.id === aiMsgId ? { ...m, content: aiResponse } : m
                ));
              }
            } catch { /* ignore parse errors */ }
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
              className={`flex gap-2 ${msg.sender_type === 'user' || msg.sender_type === 'visitor' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                msg.sender_type === 'user' || msg.sender_type === 'visitor'
                  ? 'bg-primary' 
                  : msg.sender_type === 'admin'
                    ? 'bg-green-500/20'
                    : 'bg-secondary'
              }`}>
                {msg.sender_type === 'user' || msg.sender_type === 'visitor' ? (
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
                msg.sender_type === 'user' || msg.sender_type === 'visitor'
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
          {agentIsTyping && !isLoading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center overflow-hidden">
                {agentInfo?.avatar_url ? (
                  <img src={agentInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-green-500" />
                )}
              </div>
              <div className="bg-secondary px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {agentInfo?.display_name || agentInfo?.username || 'Agent'} is typing...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        {isClosed ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">This chat has been closed.</p>
            <Button onClick={startNewChat} className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        ) : (
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (mode === 'agent') sendTypingIndicator();
              }}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputText.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
