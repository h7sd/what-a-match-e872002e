import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, User, Bot, Loader2, RefreshCw, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface AdminProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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
  const [adminProfiles, setAdminProfiles] = useState<Record<string, AdminProfile>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [currentAdminProfile, setCurrentAdminProfile] = useState<AdminProfile | null>(null);
  const [userIsTyping, setUserIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();
    loadCurrentAdminProfile();
    
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
  }, [user]);

  const loadCurrentAdminProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setCurrentAdminProfile(data);
    }
  };

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
  }, [messages, userIsTyping]);

  // Listen for user typing via broadcast
  useEffect(() => {
    if (!selectedConversation) return;

    const channelName = `typing-admin-${selectedConversation.id}`;
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender === 'user') {
          setUserIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setUserIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation?.id]);

  // Send admin typing indicator - using a separate channel instance
  const sendTypingIndicator = useCallback(async () => {
    if (!selectedConversation) return;
    const channelName = `typing-user-${selectedConversation.id}`;
    const channel = supabase.channel(channelName);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: 'admin' }
    });
  }, [selectedConversation?.id]);

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
      
      // Load admin profiles for assigned conversations
      const assignedIds = [...new Set((data || []).filter(c => c.assigned_admin_id).map(c => c.assigned_admin_id))];
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', assignedIds);
        
        if (profiles) {
          const profileMap: Record<string, AdminProfile> = {};
          profiles.forEach(p => { profileMap[p.user_id] = p; });
          setAdminProfiles(prev => ({ ...prev, ...profileMap }));
        }
      }

      // Load user profiles for logged-in users
      const userIds = [...new Set((data || []).filter(c => c.user_id).map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds);
        
        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.user_id] = p; });
          setUserProfiles(prev => ({ ...prev, ...profileMap }));
        }
      }
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

  const getAdminInfo = (userId: string | null) => {
    if (!userId) return null;
    if (adminProfiles[userId]) return adminProfiles[userId];
    if (user?.id && userId === user.id && currentAdminProfile) return currentAdminProfile;
    return null;
  };

  const getUserInfo = (userId: string | null) => {
    if (!userId) return null;
    return userProfiles[userId] || null;
  };

  const claimConversation = async (conv: Conversation) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('live_chat_conversations')
        .update({ 
          assigned_admin_id: user.id,
          status: 'active'
        })
        .eq('id', conv.id);
      
      if (error) throw error;
      
      // Update local state
      setSelectedConversation(prev => prev ? { ...prev, assigned_admin_id: user.id, status: 'active' } : null);
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, assigned_admin_id: user.id, status: 'active' } : c
      ));
      
      // Add current admin to profiles cache
      if (currentAdminProfile) {
        setAdminProfiles(prev => ({ ...prev, [user.id]: currentAdminProfile }));
      }

      // Add system message for the user
      await supabase.from('live_chat_messages').insert({
        conversation_id: conv.id,
        sender_type: 'admin',
        sender_id: user.id,
        message: `${currentAdminProfile?.display_name || currentAdminProfile?.username || 'A support agent'} has joined the chat and will assist you shortly.`,
      });

      toast({ title: 'Conversation claimed' });
    } catch (error) {
      console.error('Error claiming conversation:', error);
      toast({ title: 'Failed to claim conversation', variant: 'destructive' });
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConversation || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      // If not claimed yet, claim it first
      if (!selectedConversation.assigned_admin_id && user) {
        await claimConversation(selectedConversation);
      }

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
      // Add closing message for the user
      await supabase.from('live_chat_messages').insert({
        conversation_id: selectedConversation.id,
        sender_type: 'admin',
        sender_id: user?.id,
        message: 'This chat has been closed. Thank you for contacting UserVault Support! If you need further assistance, please start a new chat.',
      });

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

  const getStatusBadge = (status: string, assignedId: string | null) => {
    if (status === 'waiting_for_agent') {
      return <Badge variant="destructive" className="text-[10px]">Waiting</Badge>;
    }
    if (assignedId) {
      return <Badge className="bg-green-500/20 text-green-500 text-[10px]">Claimed</Badge>;
    }
    return <Badge className="bg-amber-500/20 text-amber-500 text-[10px]">Active</Badge>;
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
                {conversations.map((conv) => {
                  const assignedAdmin = getAdminInfo(conv.assigned_admin_id);
                  return (
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
                        {getStatusBadge(conv.status, conv.assigned_admin_id)}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {conv.user_id && userProfiles[conv.user_id] ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={userProfiles[conv.user_id].avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-secondary">
                              {(userProfiles[conv.user_id].display_name || userProfiles[conv.user_id].username)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground truncate">
                            {userProfiles[conv.user_id].display_name || userProfiles[conv.user_id].username}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.user_id ? 'Loading...' : `Guest #${conv.visitor_id?.slice(-6)}`}
                        </p>
                      )}
                      {assignedAdmin && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={assignedAdmin.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/20">
                              {(assignedAdmin.display_name || assignedAdmin.username)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-primary truncate">
                            {assignedAdmin.display_name || assignedAdmin.username}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  {selectedConversation.user_id && getUserInfo(selectedConversation.user_id) ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getUserInfo(selectedConversation.user_id)?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-secondary">
                          {(getUserInfo(selectedConversation.user_id)?.display_name || 
                            getUserInfo(selectedConversation.user_id)?.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-medium">
                          {getUserInfo(selectedConversation.user_id)?.display_name || 
                           getUserInfo(selectedConversation.user_id)?.username}
                        </span>
                        <p className="text-[10px] text-muted-foreground">Registered User</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">Guest</span>
                        <p className="text-[10px] text-muted-foreground">
                          #{selectedConversation.visitor_id?.slice(-6) || 'Anonymous'}
                        </p>
                      </div>
                    </>
                  )}
                  {selectedConversation.assigned_admin_id && (
                    <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-primary/10">
                      <UserCheck className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary">
                        {getAdminInfo(selectedConversation.assigned_admin_id)?.display_name || 
                         getAdminInfo(selectedConversation.assigned_admin_id)?.username || 
                         'Agent'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selectedConversation.assigned_admin_id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => claimConversation(selectedConversation)}
                      className="border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      Claim
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={closeConversation}>
                    Close Chat
                  </Button>
                </div>
              </div>

              {/* Claimed Banner */}
              {selectedConversation.assigned_admin_id && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border-b border-primary/20">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={getAdminInfo(selectedConversation.assigned_admin_id)?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-xs">
                      {(getAdminInfo(selectedConversation.assigned_admin_id)?.display_name || 
                        getAdminInfo(selectedConversation.assigned_admin_id)?.username || 'A')?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-primary">
                      {getAdminInfo(selectedConversation.assigned_admin_id)?.display_name || 
                       getAdminInfo(selectedConversation.assigned_admin_id)?.username || 
                       'A support agent'} is handling this conversation
                    </p>
                    <p className="text-[10px] text-muted-foreground">AI responses are disabled</p>
                  </div>
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const senderAdmin = msg.sender_type === 'admin' ? getAdminInfo(msg.sender_id) : null;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                          msg.sender_type === 'user'
                            ? 'bg-secondary'
                            : msg.sender_type === 'admin'
                              ? 'bg-primary'
                              : 'bg-purple-500/20'
                        }`}>
                          {msg.sender_type === 'user' ? (
                            <User className="w-3 h-3 text-muted-foreground" />
                          ) : msg.sender_type === 'admin' ? (
                            senderAdmin?.avatar_url ? (
                              <img src={senderAdmin.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-3 h-3 text-primary-foreground" />
                            )
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
                    );
                  })}
                  {userIsTyping && (
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                        {selectedConversation.user_id && getUserInfo(selectedConversation.user_id)?.avatar_url ? (
                          <img 
                            src={getUserInfo(selectedConversation.user_id)?.avatar_url || ''} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="bg-secondary px-3 py-2 rounded-xl rounded-tl-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedConversation.user_id && getUserInfo(selectedConversation.user_id)
                          ? `${getUserInfo(selectedConversation.user_id)?.display_name || getUserInfo(selectedConversation.user_id)?.username} is typing...`
                          : 'Guest is typing...'}
                      </span>
                    </div>
                  )}
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
                    onChange={(e) => {
                      setInputText(e.target.value);
                      sendTypingIndicator();
                    }}
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
