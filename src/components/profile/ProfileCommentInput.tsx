import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { invokeSecure } from '@/lib/secureEdgeFunctions';

interface ProfileCommentInputProps {
  username: string;
  accentColor?: string;
  className?: string;
}

interface PlopBubble {
  id: number;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  delay: number;
}

export function ProfileCommentInput({
  username,
  accentColor = '#8b5cf6',
  className,
}: ProfileCommentInputProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bubbles, setBubbles] = useState<PlopBubble[]>([]);
  const bubbleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const nextBubbleId = useRef(0);
  const { toast } = useToast();

  // Generate random bubbles EVERYWHERE across the viewport
  const spawnBubbles = useCallback((text: string) => {
    const count = 10 + Math.floor(Math.random() * 8); // 10-17 bubbles
    const newBubbles: PlopBubble[] = [];

    // Size distribution: some tiny, some medium, some HUGE
    const sizes = [0.3, 0.4, 0.5, 0.7, 0.9, 1.0, 1.2, 1.5, 1.8, 2.2, 2.5];

    for (let i = 0; i < count; i++) {
      newBubbles.push({
        id: nextBubbleId.current++,
        text,
        x: 2 + Math.random() * 96, // 2-98% - truly everywhere horizontally
        y: 2 + Math.random() * 94, // 2-96% - truly everywhere vertically
        scale: sizes[Math.floor(Math.random() * sizes.length)], // random from size pool
        rotation: -25 + Math.random() * 50, // -25 to +25 degrees
        delay: i * 0.06, // faster stagger
      });
    }

    setBubbles(newBubbles);
  }, []);

  // Animate bubbles with GSAP
  useEffect(() => {
    if (bubbles.length === 0) return;

    bubbles.forEach((bubble) => {
      const el = bubbleRefs.current.get(bubble.id);
      if (!el) return;

      gsap.killTweensOf(el);

      // Initial state
      gsap.set(el, {
        scale: 0,
        opacity: 0,
        rotation: bubble.rotation,
        transformOrigin: '50% 50%',
      });

      // Plop in with back.out overshoot
      const tl = gsap.timeline({ delay: bubble.delay });

      tl.to(el, {
        scale: bubble.scale,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
      });

      // Subtle float
      tl.to(el, {
        y: -10 + Math.random() * 20,
        rotation: bubble.rotation + (-5 + Math.random() * 10),
        duration: 0.8,
        ease: 'power1.inOut',
      });

      // Plop out
      tl.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.5)',
        delay: 1.2,
      });

      tl.eventCallback('onComplete', () => {
        // Clear bubbles after last one finishes
        if (bubble.id === bubbles[bubbles.length - 1].id) {
          setBubbles([]);
          bubbleRefs.current.clear();
        }
      });
    });
  }, [bubbles]);

  const handleSubmit = async () => {
    const message = comment.trim();
    if (!message || isSubmitting) return;

    if (!username) {
      toast({
        title: 'Failed to send comment',
        description: 'Profile not loaded yet. Please try again in a second.',
        variant: 'destructive',
      });
      return;
    }

    if (comment.length > 280) {
      toast({
        title: 'Comment too long',
        description: 'Maximum 280 characters allowed.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await invokeSecure<{
        success?: boolean;
        message?: string;
        error?: string;
      }>('profile-comment', {
        body: { action: 'add_comment', username, content: message },
      });

      if (error) {
        console.error('profile-comment add_comment failed:', error);
        toast({
          title: 'Failed to send comment',
          description: error.message || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        console.error('profile-comment add_comment error payload:', data);
        toast({
          title: 'Failed to send comment',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Trigger multi-bubble plop animation
      spawnBubbles(message);
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

  // Render bubbles via Portal to escape any parent transform/overflow constraints
  const bubbleOverlay = bubbles.length > 0 
    ? createPortal(
        <div 
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            overflow: 'visible',
          }}
        >
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              ref={(el) => {
                if (el) bubbleRefs.current.set(bubble.id, el);
              }}
              style={{
                position: 'absolute',
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="rounded-full font-bold whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: '#ffffff',
                  boxShadow: `
                    0 8px 32px rgba(0,0,0,0.25),
                    0 2px 8px rgba(0,0,0,0.15),
                    inset 0 2px 4px rgba(255,255,255,0.25),
                    inset 0 -1px 2px rgba(255,255,255,0.1),
                    0 0 0 1px rgba(255,255,255,0.1)
                  `,
                  fontSize: `${0.6 + bubble.scale * 0.7}rem`,
                  padding: bubble.scale > 1.5 
                    ? '0.85rem 1.75rem' 
                    : bubble.scale < 0.6 
                      ? '0.3rem 0.6rem' 
                      : '0.6rem 1.2rem',
                }}
              >
                <span 
                  className="block whitespace-normal break-words text-center"
                  style={{
                    maxWidth: bubble.scale > 1.5 ? 'min(90vw, 28rem)' : 'min(70vw, 18rem)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.15)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {bubble.text}
                </span>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {bubbleOverlay}

      <div className={cn('w-full relative', className)}>
        <motion.div
          className={cn(
            'relative flex items-center gap-2 p-2 rounded-full',
            'bg-black/30 backdrop-blur-md border',
            'transition-colors duration-300'
          )}
          style={{
            borderColor:
              comment.length > 0 ? `${accentColor}50` : 'rgba(255,255,255,0.1)',
          }}
        >
          <MessageCircle
            className="w-4 h-4 ml-2 flex-shrink-0 transition-colors duration-200"
            style={{
              color: comment.length > 0 ? accentColor : 'rgba(255,255,255,0.5)',
            }}
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
              'flex-1 bg-transparent border-none outline-none',
              'text-sm text-white placeholder:text-white/40',
              'disabled:opacity-50'
            )}
          />

          <motion.button
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              'transition-all duration-200'
            )}
            style={{
              background:
                comment.trim() && !isSubmitting
                  ? `${accentColor}30`
                  : 'rgba(255,255,255,0.05)',
              color:
                comment.trim() && !isSubmitting
                  ? accentColor
                  : 'rgba(255,255,255,0.3)',
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
              'text-xs mt-1 text-right px-2',
              comment.length > 260 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {comment.length}/280
          </motion.div>
        )}
      </div>
    </>
  );
}
