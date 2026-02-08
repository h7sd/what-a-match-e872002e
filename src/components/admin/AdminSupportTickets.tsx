import { useState, useEffect } from 'react';
import { Mail, Loader2, RefreshCw, Send, MessageSquare, User, Clock, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-proxy-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { maskEmail } from '@/lib/utils/maskEmail';

interface SupportTicket {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  username: string | null;
  user_id: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_type: string;
  sender_id: string | null;
  created_at: string;
}

interface AdminProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function AdminSupportTickets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [adminProfiles, setAdminProfiles] = useState<Record<string, AdminProfile>>({});
  const [currentAdminProfile, setCurrentAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    loadTickets();
    loadCurrentAdminProfile();
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

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      
      // Load admin profiles for claimed tickets
      const claimedByIds = [...new Set((data || []).filter(t => t.claimed_by).map(t => t.claimed_by))];
      if (claimedByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', claimedByIds);
        
        if (profiles) {
          const profileMap: Record<string, AdminProfile> = {};
          profiles.forEach(p => { profileMap[p.user_id] = p; });
          setAdminProfiles(profileMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast({ title: 'Error loading tickets', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
    setReplyText('');
    await loadMessages(ticket.id);
  };

  const claimTicket = async (ticketId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('claim-support-ticket', {
        body: { ticketId },
      });
      if (error) throw error;
      const updatedTicket = (data as any)?.ticket as SupportTicket | undefined;
      if (!updatedTicket) throw new Error('Claim failed');
      
      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, ...updatedTicket } 
          : t
      ));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => (prev ? { ...prev, ...updatedTicket } : null));
      }
      
      // Add current admin to profiles cache
      if (currentAdminProfile) {
        setAdminProfiles(prev => ({ ...prev, [user.id]: currentAdminProfile }));
      }
      
      toast({ title: 'Ticket claimed successfully' });
    } catch (error: any) {
      toast({ title: error?.message || 'Error claiming ticket', variant: 'destructive' });
    }
  };

  const sendReply = async (closeTicket = false) => {
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('reply-support-email', {
        body: {
          ticketId: selectedTicket.id,
          message: replyText,
          closeTicket,
        },
      });

      if (error) throw error;

      toast({
        title: closeTicket ? 'Ticket closed & reply sent' : 'Reply sent',
        description: `Email sent to ${selectedTicket.email}`,
      });

      setReplyText('');
      
      if (closeTicket) {
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id 
            ? { ...t, status: 'closed', updated_at: new Date().toISOString() } 
            : t
        ));
        setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
        setIsDialogOpen(false);
      } else {
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id 
            ? { ...t, status: 'in_progress', updated_at: new Date().toISOString() } 
            : t
        ));
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        await loadMessages(selectedTicket.id);
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({ title: error.message || 'Error sending reply', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      await loadTickets();
      toast({ title: `Ticket marked as ${status}` });
    } catch (error: any) {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive" className="text-[10px]">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/20 text-amber-500 text-[10px]">In Progress</Badge>;
      case 'closed':
        return <Badge className="bg-green-500/20 text-green-500 text-[10px]">Closed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getAdminInfo = (userId: string | null) => {
    if (!userId) return null;
    return adminProfiles[userId] || null;
  };

  const getAdminInfoWithFallback = (userId: string | null) => {
    if (!userId) return null;
    const cached = getAdminInfo(userId);
    if (cached) return cached;
    if (user?.id && userId === user.id && currentAdminProfile) return currentAdminProfile;
    return null;
  };

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'progress') return t.status === 'in_progress';
    if (activeTab === 'closed') return t.status === 'closed';
    return true;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const progressCount = tickets.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Support Tickets</h3>
            <p className="text-sm text-muted-foreground">support@uservault.cc</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadTickets} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="open" className="text-sm">
            Open {openCount > 0 && `(${openCount})`}
          </TabsTrigger>
          <TabsTrigger value="progress" className="text-sm">
            In Progress {progressCount > 0 && `(${progressCount})`}
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">
            Closed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No tickets in this category
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredTickets.map((ticket) => {
                const claimedAdmin = getAdminInfo(ticket.claimed_by);
                return (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors"
                    onClick={() => openTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(ticket.status)}
                          {ticket.username && (
                            <span className="text-xs text-primary font-medium">@{ticket.username}</span>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate mb-1">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{maskEmail(ticket.email)}</p>
                        
                        {/* Show claimed info */}
                        {claimedAdmin && (
                          <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={claimedAdmin.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/20">
                                {(claimedAdmin.display_name || claimedAdmin.username)?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-primary">
                              Claimed by <strong>{claimedAdmin.display_name || claimedAdmin.username}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ticket.created_at).toLocaleDateString('en-US')}
                        </div>
                        {!ticket.claimed_by && ticket.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              claimTicket(ticket.id);
                            }}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {selectedTicket?.subject}
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {maskEmail(selectedTicket?.email)}
                {selectedTicket?.username && (
                  <span className="text-primary">(@{selectedTicket.username})</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {selectedTicket && new Date(selectedTicket.created_at).toLocaleString('en-US')}
              </span>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
          </DialogHeader>

          {/* Claimed Banner */}
          {selectedTicket?.claimed_by && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAdminInfoWithFallback(selectedTicket.claimed_by)?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-xs">
                  {(getAdminInfoWithFallback(selectedTicket.claimed_by)?.display_name || getAdminInfoWithFallback(selectedTicket.claimed_by)?.username || 'S')?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  {(getAdminInfoWithFallback(selectedTicket.claimed_by)?.display_name || getAdminInfoWithFallback(selectedTicket.claimed_by)?.username || 'A support agent')} has claimed this ticket
                </p>
                <p className="text-xs text-muted-foreground">
                  Will be processed as soon as possible
                </p>
              </div>
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
          )}

          {/* Claim Button if not claimed */}
          {selectedTicket && !selectedTicket.claimed_by && selectedTicket.status !== 'closed' && (
            <Button
              variant="outline"
              className="w-full border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => claimTicket(selectedTicket.id)}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Claim this ticket
            </Button>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] pr-4">
            <div className="space-y-3">
              {messages.map((msg) => {
                const senderAdmin = msg.sender_type === 'admin' ? getAdminInfo(msg.sender_id) : null;
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sender_type === 'admin'
                        ? 'bg-primary/10 border border-primary/30 ml-8'
                        : 'bg-secondary/50 border border-border mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {msg.sender_type === 'admin' && senderAdmin && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={senderAdmin.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/20">
                              {(senderAdmin.display_name || senderAdmin.username)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs font-medium">
                          {msg.sender_type === 'admin' 
                            ? (senderAdmin?.display_name || senderAdmin?.username || 'Support Team')
                            : 'User'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('en-US')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply Form */}
          {selectedTicket?.status !== 'closed' && (
            <div className="space-y-3 pt-4 border-t">
              <Textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => sendReply(false)}
                  disabled={isSending || !replyText.trim()}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => sendReply(true)}
                  disabled={isSending || !replyText.trim()}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Send & Close
                </Button>
              </div>
            </div>
          )}

          {selectedTicket?.status === 'closed' && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => updateStatus(selectedTicket.id, 'open')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Reopen Ticket
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
