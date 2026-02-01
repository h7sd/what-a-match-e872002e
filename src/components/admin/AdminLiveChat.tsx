import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, Bot, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  user_id: string | null;
  visitor_id: string | null;
  status: string;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
}

export function AdminLiveChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to new conversations
    const channel = supabase
      .channel('admin-live-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_chat_conversations' },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages(selectedConversation.id);

    const channel = supabase
      .channel(`admin-chat-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_chat_conversations')
        .select('*')
        .in('status', ['active', 'waiting_for_agent'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    
    // Assign admin if waiting
    if (conv.status === 'waiting_for_agent' && !conv.assigned_admin_id) {
      await supabase
        .from('live_chat_conversations')
        .update({ 
          assigned_admin_id: user?.id,
          status: 'active'
        })
        .eq('id', conv.id);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConversation || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const { error } = await supabase.from('live_chat_messages').insert({
        conversation_id: selectedConversation.id,
        sender_type: 'admin',
        sender_id: user?.id,
        message: messageText,
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('live_chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('live_chat_conversations')
        .update({ status: 'closed' })
        .eq('id', selectedConversation.id);

      setSelectedConversation(null);
      loadConversations();
      toast({ title: 'Conversation closed' });
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_for_agent':
        return <Badge variant="destructive" className="text-[10px]">Waiting</Badge>;
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 text-[10px]">Active</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Live Chat</h3>
            <p className="text-sm text-muted-foreground">Real-time support conversations</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadConversations} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[500px]">
        {/* Conversations List */}
        <div className="col-span-1 border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border bg-secondary/30">
            <h4 className="font-medium text-sm">Conversations ({conversations.length})</h4>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active conversations</p>
            ) : (
              <div className="p-2 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getStatusBadge(conv.status)}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.user_id ? 'Registered User' : `Visitor ${conv.visitor_id?.slice(-6)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="col-span-2 border border-border rounded-lg overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {selectedConversation.user_id ? 'Registered User' : `Visitor`}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={closeConversation}>
                  Close Chat
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        msg.sender_type === 'user'
                          ? 'bg-secondary'
                          : msg.sender_type === 'admin'
                            ? 'bg-primary'
                            : 'bg-purple-500/20'
                      }`}>
                        {msg.sender_type === 'user' ? (
                          <User className="w-3 h-3 text-muted-foreground" />
                        ) : msg.sender_type === 'admin' ? (
                          <Users className="w-3 h-3 text-primary-foreground" />
                        ) : (
                          <Bot className="w-3 h-3 text-purple-500" />
                        )}
                      </div>
                      <div className={`max-w-[70%] p-2.5 rounded-xl text-sm ${
                        msg.sender_type === 'admin'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : msg.sender_type === 'ai'
                            ? 'bg-purple-500/10 border border-purple-500/20 rounded-tl-sm'
                            : 'bg-secondary rounded-tl-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex gap-2"
                >
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" disabled={isSending || !inputText.trim()}>
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
