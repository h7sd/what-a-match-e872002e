import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProfileCommentInputProps {
  username: string;
  accentColor?: string;
  className?: string;
}

export function ProfileCommentInput({
  username,
  accentColor = '#8b5cf6',
  className,
}: ProfileCommentInputProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;
    
    if (comment.length > 280) {
      toast({ 
        title: 'Comment too long', 
        description: 'Maximum 280 characters allowed.',
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('profile-comment', {
        body: { action: 'add_comment', username, content: comment.trim() }
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }

      // Success animation
      setShowSuccess(true);
      setComment('');
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);

    } catch (e) {
      console.error('Failed to submit comment:', e);
      toast({ title: 'Failed to send comment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className={cn(
          "relative flex items-center gap-2 p-2 rounded-full",
          "bg-black/30 backdrop-blur-md border border-white/10",
          "transition-all duration-300"
        )}
        style={{
          boxShadow: comment.length > 0 ? `0 0 20px ${accentColor}30` : 'none',
        }}
      >
        <MessageCircle className="w-4 h-4 text-white/50 ml-2 flex-shrink-0" />
        
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment..."
          maxLength={280}
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-sm text-white placeholder:text-white/40",
            "disabled:opacity-50"
          )}
        />
        
        <motion.button
          onClick={handleSubmit}
          disabled={!comment.trim() || isSubmitting}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "transition-all duration-200",
            comment.trim() && !isSubmitting
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          )}
          whileHover={comment.trim() && !isSubmitting ? { scale: 1.1 } : {}}
          whileTap={comment.trim() && !isSubmitting ? { scale: 0.9 } : {}}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </motion.button>
      </motion.div>

      {/* Success Plop Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.8, y: -40 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="absolute left-1/2 -translate-x-1/2 -top-8 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-medium backdrop-blur-sm"
            >
              ✓ Comment sent!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character count */}
      {comment.length > 200 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "text-xs mt-1 text-right px-2",
            comment.length > 260 ? "text-red-400" : "text-white/40"
          )}
        >
          {comment.length}/280
        </motion.div>
      )}
    </div>
  );
}
