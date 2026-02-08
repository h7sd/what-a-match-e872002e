import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-proxy-client';
import { Link } from 'react-router-dom';

interface ClaimedNotification {
  id: string;
  username: string;
  claimedBy: string;
  isRare: boolean;
  rarity: 'legendary' | 'epic' | 'rare' | 'common';
  timestamp: Date;
}

function getRarity(username: string): { isRare: boolean; rarity: 'legendary' | 'epic' | 'rare' | 'common' } {
  const length = username.length;
  
  if (length === 1) {
    return { isRare: true, rarity: 'legendary' };
  } else if (length === 2) {
    return { isRare: true, rarity: 'epic' };
  } else if (length === 3) {
    return { isRare: true, rarity: 'rare' };
  } else if (length === 4) {
    return { isRare: true, rarity: 'rare' };
  } else {
    return { isRare: false, rarity: 'common' };
  }
}

function getRarityConfig(rarity: 'legendary' | 'epic' | 'rare' | 'common') {
  switch (rarity) {
    case 'legendary':
      return {
        icon: Crown,
        label: 'LEGENDARY',
        gradient: 'from-yellow-400 via-orange-500 to-red-500',
        border: 'border-yellow-500/50',
        glow: 'shadow-[0_0_30px_rgba(234,179,8,0.5)]',
        bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
      };
    case 'epic':
      return {
        icon: Star,
        label: 'EPIC',
        gradient: 'from-purple-400 via-pink-500 to-purple-600',
        border: 'border-purple-500/50',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
        bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      };
    case 'rare':
      return {
        icon: Sparkles,
        label: 'RARE',
        gradient: 'from-blue-400 via-cyan-500 to-blue-600',
        border: 'border-blue-500/50',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      };
    default:
      return {
        icon: null,
        label: null,
        gradient: 'from-gray-400 to-gray-500',
        border: 'border-border',
        glow: '',
        bg: 'bg-secondary/50',
      };
  }
}

export function ClaimedUsernamePopup() {
  const [notifications, setNotifications] = useState<ClaimedNotification[]>([]);

  useEffect(() => {
    // Subscribe to realtime changes on alias_requests
    const channel = supabase
      .channel('claimed-usernames')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alias_requests',
          filter: 'status=eq.approved',
        },
        async (payload) => {
          const request = payload.new as any;
          
          // Only show if just approved (check responded_at is recent)
          const respondedAt = new Date(request.responded_at);
          const now = new Date();
          const diffSeconds = (now.getTime() - respondedAt.getTime()) / 1000;
          
          // Only show if approved within last 30 seconds
          if (diffSeconds > 30) return;

          // Fetch the requester's username
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', request.requester_id)
            .single();

          const { isRare, rarity } = getRarity(request.requested_alias);

          const notification: ClaimedNotification = {
            id: request.id,
            username: request.requested_alias,
            claimedBy: profile?.username || 'Unknown',
            isRare,
            rarity,
            timestamp: new Date(),
          };

          setNotifications(prev => [notification, ...prev].slice(0, 5));

          // Auto-remove after 10 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => {
          const config = getRarityConfig(notification.rarity);
          const Icon = config.icon;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} ${config.glow} backdrop-blur-xl`}
            >
              {/* Animated gradient border for rare items */}
              {notification.isRare && (
                <div className="absolute inset-0 -z-10">
                  <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-20 animate-pulse`} />
                </div>
              )}

              <div className="p-4">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-3">
                  {Icon && (
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {config.label && (
                      <div className={`text-xs font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-1`}>
                        {config.label} USERNAME CLAIMED!
                      </div>
                    )}
                    {!config.label && (
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Username Claimed
                      </div>
                    )}

                    <Link 
                      to={`/${notification.claimedBy}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                          @{notification.username}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Claimed by <span className="text-foreground font-medium">@{notification.claimedBy}</span>
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Progress bar for auto-dismiss */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${config.gradient}`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
