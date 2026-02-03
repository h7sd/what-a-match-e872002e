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
  const successRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // GSAP plop animation like BubbleMenu - back.out(1.5) easing
  useEffect(() => {
    if (showSuccess && successRef.current) {
      gsap.killTweensOf(successRef.current);
      
      // Initial state - hidden and scaled down
      gsap.set(successRef.current, {
        scale: 0,
        opacity: 0,
        y: 0,
        transformOrigin: '50% 50%'
      });

      // Plop in with back.out easing (exactly like BubbleMenu)
      const tl = gsap.timeline();
      
      // First: plop in with back.out(1.5) - the signature bouncy effect
      tl.to(successRef.current, {
        scale: 1,
        opacity: 1,
        y: -40,
        duration: 0.5,
        ease: 'back.out(1.5)'
      });

      // Hold visible for a moment, then fade away smoothly
      tl.to(successRef.current, {
        opacity: 0,
        y: -60,
        scale: 0.9,
        duration: 0.35,
        ease: 'power2.in',
        delay: 1.5
      });

      tl.eventCallback('onComplete', () => {
        setShowSuccess(false);
      });
    }
  }, [showSuccess]);

  // Input container pulse animation on success
  useEffect(() => {
    if (showSuccess && inputContainerRef.current) {
      gsap.to(inputContainerRef.current, {
        boxShadow: `0 0 30px ${accentColor}60`,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(inputContainerRef.current, {
        boxShadow: `0 0 0px ${accentColor}00`,
        duration: 0.5,
        ease: 'power2.in',
        delay: 0.3
      });
    }
  }, [showSuccess, accentColor]);

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
      {/* Success Plop Animation - GSAP based with back.out(1.5) like BubbleMenu */}
      <div
        ref={successRef}
        className="absolute left-1/2 -translate-x-1/2 -top-2 pointer-events-none z-50"
        style={{ opacity: 0 }}
      >
        <div
          className="px-5 py-2.5 rounded-full border backdrop-blur-md text-sm font-semibold whitespace-nowrap shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`,
            borderColor: accentColor,
            color: accentColor,
            boxShadow: `0 8px 32px ${accentColor}40, 0 0 0 1px ${accentColor}20`
          }}
        >
          ✓ Comment sent!
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