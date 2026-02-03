import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Bell, AlertCircle, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useBadges';
import { cn } from '@/lib/utils';

interface ChatNotification {
  conversation_id: string;
  visitor_display: string;
  status: string;
  last_message_at: string;
  unread_count: number;
}

export function AdminChatNotificationBell() {
  const { data: isAdmin = false, isLoading: adminLoading } = useIsAdmin();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const loadNotifications = useCallback(async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      // Use the secure RPC function - only admins can access
      const { data, error } = await supabase.rpc('get_admin_chat_notifications');
      
      if (error) {
        // Access denied or other error - fail silently for security
        console.error('Notification load error');
        setNotifications([]);
        return;
      }
      
      setNotifications(data || []);
    } catch (err) {
      // Fail silently - don't expose error details
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  // Load notifications on mount and when admin status changes
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      loadNotifications();
    }
  }, [isAdmin, adminLoading, loadNotifications]);

  // Subscribe to realtime updates for new conversations
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-chat-notifications')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_chat_conversations' 
        },
        () => {
          // Reload notifications when conversations change
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'live_chat_messages' 
        },
        () => {
          // Reload notifications when new messages arrive
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadNotifications]);

  // Poll every 30 seconds as fallback
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, loadNotifications]);

  const handleNotificationClick = (conversationId: string) => {
    setIsOpen(false);
    // Navigate to admin panel with live chat tab
    navigate('/dashboard#admin', { state: { openLiveChat: true, conversationId } });
  };

  const totalUnread = notifications.reduce((sum, n) => sum + n.unread_count, 0);
  const waitingCount = notifications.filter(n => n.status === 'waiting_for_agent').length;

  // Don't render for non-admins
  if (!isAdmin || adminLoading) {
    return null;
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Live Chat Notifications"
        >
          <MessageCircle className="h-5 w-5" />
          {(totalUnread > 0 || waitingCount > 0) && (
            <span className={cn(
              "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              waitingCount > 0 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground"
            )}>
              {waitingCount > 0 ? waitingCount : totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-3 border-b border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Live Chat
            </h4>
            {waitingCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {waitingCount} waiting
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active chats</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <button
                  key={notification.conversation_id}
                  onClick={() => handleNotificationClick(notification.conversation_id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    "hover:bg-secondary/50",
                    notification.status === 'waiting_for_agent' && "bg-destructive/10 border border-destructive/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        notification.status === 'waiting_for_agent' 
                          ? "bg-destructive/20" 
                          : "bg-secondary"
                      )}>
                        {notification.status === 'waiting_for_agent' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.visitor_display}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(notification.last_message_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {notification.status === 'waiting_for_agent' && (
                        <Badge variant="destructive" className="text-[9px] px-1.5">
                          WAITING
                        </Badge>
                      )}
                      {notification.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                          {notification.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              navigate('/dashboard#admin');
            }}
          >
            Open Live Chat Panel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
