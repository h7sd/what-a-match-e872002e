import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Check, Loader2, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
  is_read: boolean;
}

export function ProfileCommentsViewer() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('profile-comment', {
        body: { action: 'get_my_comments' }
      });

      if (error) throw error;
      
      if (data?.comments) {
        setComments(data.comments);
      }
    } catch (e) {
      console.error('Failed to fetch comments:', e);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchComments, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (commentId: string) => {
    try {
      await supabase.functions.invoke('profile-comment', {
        body: { action: 'mark_read', comment_id: commentId }
      });
      
      setComments(prev => 
        prev.map(c => c.id === commentId ? { ...c, is_read: true } : c)
      );
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{error}</p>
        <Button variant="ghost" onClick={fetchComments} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No comments yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Comments from visitors will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {comments.filter(c => !c.is_read).length} unread
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchComments}>
          Refresh
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {comments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "p-4 rounded-lg border transition-all duration-300",
              comment.is_read 
                ? "bg-card/30 border-border/30 opacity-60" 
                : "bg-card border-border shadow-sm"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm flex-1 break-words">{comment.content}</p>
              
              {!comment.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => markAsRead(comment.id)}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(comment.created_at), { 
                  addSuffix: true,
                  locale: de 
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                expires in {getTimeRemaining(comment.expires_at)}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
