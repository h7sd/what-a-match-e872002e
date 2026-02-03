import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { gsap } from 'gsap';
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
  const successRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // GSAP plop animation like BubbleMenu
  useEffect(() => {
    if (showSuccess && successRef.current) {
      gsap.killTweensOf(successRef.current);
      
      // Initial state
      gsap.set(successRef.current, {
        scale: 0,
        opacity: 0,
        y: 0,
        transformOrigin: '50% 50%'
      });

      // Plop in with back.out easing (like BubbleMenu)
      const tl = gsap.timeline();
      tl.to(successRef.current, {
        scale: 1,
        opacity: 1,
        y: -30,
        duration: 0.5,
        ease: 'back.out(1.5)'
      });

      // Hold for a moment then fade away
      tl.to(successRef.current, {
        opacity: 0,
        y: -50,
        scale: 0.8,
        duration: 0.4,
        ease: 'power3.in',
        delay: 1.2
      });

      tl.eventCallback('onComplete', () => {
        setShowSuccess(false);
      });
    }
  }, [showSuccess]);

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

      // Trigger GSAP plop animation
      setShowSuccess(true);
      setComment('');

    } catch (e) {
      console.error('Failed to submit comment:', e);
      toast({ title: 'Failed to send comment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full relative", className)}>
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

      {/* Success Plop Animation - GSAP based like BubbleMenu */}
      {showSuccess && (
        <div
          ref={successRef}
          className="absolute left-1/2 -translate-x-1/2 -top-4 pointer-events-none z-50"
          style={{ opacity: 0 }}
        >
          <div
            className="px-4 py-2 rounded-full border backdrop-blur-sm text-sm font-medium whitespace-nowrap"
            style={{
              background: `${accentColor}20`,
              borderColor: `${accentColor}50`,
              color: accentColor,
              boxShadow: `0 4px 16px ${accentColor}30`
            }}
          >
            ✓ Comment sent!
          </div>
        </div>
      )}

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