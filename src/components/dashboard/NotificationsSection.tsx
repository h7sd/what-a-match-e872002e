import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNotifications, UserNotification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, string> = {
  system: '⚙️',
  streak: '🔥',
  badge: '🏆',
  reward: '🎁',
  update: '📢',
  social: '👥',
  embed: '🔗',
};

const categoryLabels: Record<string, string> = {
  system: 'System',
  streak: 'Streaks',
  badge: 'Badges',
  reward: 'Rewards',
  update: 'Updates',
  social: 'Social',
  embed: 'Embeds',
};

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const icon = categoryIcons[notification.category] || '📬';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
      className={cn(
        'group flex items-start gap-4 p-4 rounded-xl border transition-all',
        notification.is_read
          ? 'bg-card/50 border-border/50'
          : 'bg-primary/5 border-primary/20'
      )}
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={cn(
            'font-semibold',
            !notification.is_read && 'text-foreground'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <Badge variant="default" className="text-xs py-0">New</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
          <span>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</span>
          <Badge variant="outline" className="text-xs py-0">
            {categoryLabels[notification.category] || notification.category}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMarkRead(notification.id)}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(notification.id)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export function NotificationsSection() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs px-3">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm mt-1">
              {filter === 'unread' 
                ? 'You\'re all caught up!' 
                : 'Notifications about your activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
