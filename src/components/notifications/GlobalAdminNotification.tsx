import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { gsap } from 'gsap';

interface AdminNotification {
  id: string;
  message: string;
  created_at: string;
  admin_username?: string;
  admin_avatar?: string;
}

interface PlopBubble {
  id: number;
  message: string;
  adminUsername: string;
  adminAvatar: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  delay: number;
}

export function GlobalAdminNotification() {
  const [bubbles, setBubbles] = useState<PlopBubble[]>([]);
  const bubbleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const nextBubbleId = useRef(0);
  const processedIds = useRef<Set<string>>(new Set());

  // Generate random bubbles across the viewport
  const spawnBubbles = useCallback((message: string, adminUsername: string, adminAvatar: string | null) => {
    const count = 8 + Math.floor(Math.random() * 6); // 8-13 bubbles
    const newBubbles: PlopBubble[] = [];

    // Size distribution
    const sizes = [0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8];

    for (let i = 0; i < count; i++) {
      newBubbles.push({
        id: nextBubbleId.current++,
        message,
        adminUsername,
        adminAvatar,
        x: 5 + Math.random() * 90, // 5-95%
        y: 5 + Math.random() * 85, // 5-90%
        scale: sizes[Math.floor(Math.random() * sizes.length)],
        rotation: -20 + Math.random() * 40, // -20 to +20 degrees
        delay: i * 0.08,
      });
    }

    setBubbles(prev => [...prev, ...newBubbles]);
  }, []);

  // Animate bubbles with GSAP
  useEffect(() => {
    if (bubbles.length === 0) return;

    bubbles.forEach((bubble) => {
      const el = bubbleRefs.current.get(bubble.id);
      if (!el || el.dataset.animated === 'true') return;
      
      el.dataset.animated = 'true';

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
        y: -8 + Math.random() * 16,
        rotation: bubble.rotation + (-4 + Math.random() * 8),
        duration: 0.6,
        ease: 'power1.inOut',
      });

      // Plop out after a short time
      tl.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.5)',
        delay: 2.5, // Show for ~2.5 seconds
      });

      tl.eventCallback('onComplete', () => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
        bubbleRefs.current.delete(bubble.id);
      });
    });
  }, [bubbles]);

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-plop')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        async (payload) => {
          const notif = payload.new as AdminNotification;
          
          // Prevent duplicate processing
          if (processedIds.current.has(notif.id)) return;
          processedIds.current.add(notif.id);

          // Fetch admin profile info
          let adminUsername = 'Admin';
          let adminAvatar: string | null = null;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('user_id', (payload.new as any).created_by)
              .maybeSingle();

            if (profile) {
              adminUsername = profile.username;
              adminAvatar = profile.avatar_url;
            }
          } catch (e) {
            console.error('Failed to fetch admin profile:', e);
          }

          spawnBubbles(notif.message, adminUsername, adminAvatar);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spawnBubbles]);

  if (bubbles.length === 0) return null;

  // Render bubbles via portal to document.body
  return createPortal(
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 99999 }}
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          ref={(el) => {
            if (el) bubbleRefs.current.set(bubble.id, el);
          }}
          className="absolute pointer-events-none"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Liquid glass bubble - iOS 26 style */}
          <div
            className="relative px-4 py-3 rounded-2xl max-w-[280px] min-w-[140px]"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.15),
                inset 0 2px 4px rgba(255,255,255,0.6),
                inset 0 -1px 2px rgba(255,255,255,0.2)
              `,
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          >
            {/* Admin info */}
            <div className="flex items-center gap-2 mb-2">
              {bubble.adminAvatar ? (
                <img 
                  src={bubble.adminAvatar} 
                  alt={bubble.adminUsername}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {bubble.adminUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span 
                className="text-xs font-semibold"
                style={{
                  color: 'rgba(0,0,0,0.7)',
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                }}
              >
                @{bubble.adminUsername}
              </span>
            </div>

            {/* Message */}
            <p
              className="text-sm font-medium leading-snug break-words"
              style={{
                color: 'rgba(0,0,0,0.85)',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              {bubble.message}
            </p>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
