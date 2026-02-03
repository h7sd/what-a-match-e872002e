import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const [lastSent, setLastSent] = useState('');
  const successRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // GSAP plop animation exactly like BubbleMenu - back.out(1.5) with overshoot
  useEffect(() => {
    if (showSuccess && successRef.current) {
      const el = successRef.current;
      
      // Kill any existing animations
      gsap.killTweensOf(el);
      
      // Initial state - completely hidden and scaled down
      gsap.set(el, {
        scale: 0,
        opacity: 0,
        transformOrigin: '50% 50%',
        display: 'block'
      });

      // Create timeline for the plop sequence
      const tl = gsap.timeline();
      
      // PLOP IN: Scale from 0 to 1 with back.out(1.5) overshoot
      // This creates the bouncy "plop" effect - goes past 1 then settles back
      tl.to(el, {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.5)'
      });

      // Hold visible for 1.5 seconds, then plop out
      tl.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.5)',
        delay: 1.5
      });

      tl.set(el, { display: 'none' });

      tl.eventCallback('onComplete', () => {
        setShowSuccess(false);
      });
    }
  }, [showSuccess]);


  const handleSubmit = async () => {
    const message = comment.trim();
    if (!message || isSubmitting) return;
    
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
        body: { action: 'add_comment', username, content: message }
      });

      if (error) {
        toast({
          title: 'Failed to send comment',
          description: (error as any)?.message || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }

      // Trigger GSAP plop animation
      setLastSent(message);
      setShowSuccess(true);
      setComment('');

    } catch (e) {
      console.error('Failed to submit comment:', e);
      toast({
        title: 'Failed to send comment',
        description: (e as any)?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full relative", className)}>
      {/* Success Plop Animation - GSAP based exactly like BubbleMenu */}
      <div
        ref={successRef}
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none z-50"
        style={{ display: 'none' }}
      >
        <div
          className="px-6 py-3 rounded-full backdrop-blur-md text-base font-semibold whitespace-nowrap"
          style={{
            background: accentColor,
            color: '#ffffff',
            boxShadow: `0 8px 32px ${accentColor}60, 0 4px 16px rgba(0,0,0,0.3)`
          }}
        >
          <span className="block max-w-[min(92vw,26rem)] whitespace-normal break-words text-center">
            ✓ {lastSent || 'Comment sent!'}
          </span>
        </div>
      </div>

      <motion.div
        ref={inputContainerRef}
        className={cn(
          "relative flex items-center gap-2 p-2 rounded-full",
          "bg-black/30 backdrop-blur-md border",
          "transition-colors duration-300"
        )}
        style={{
          borderColor: comment.length > 0 ? `${accentColor}50` : 'rgba(255,255,255,0.1)',
        }}
      >
        <MessageCircle 
          className="w-4 h-4 ml-2 flex-shrink-0 transition-colors duration-200" 
          style={{ color: comment.length > 0 ? accentColor : 'rgba(255,255,255,0.5)' }}
        />
        
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
            "transition-all duration-200"
          )}
          style={{
            background: comment.trim() && !isSubmitting ? `${accentColor}30` : 'rgba(255,255,255,0.05)',
            color: comment.trim() && !isSubmitting ? accentColor : 'rgba(255,255,255,0.3)',
          }}
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