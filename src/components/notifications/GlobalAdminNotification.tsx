import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminNotification {
  id: string;
  message: string;
  type: string;
  created_at: string;
  expires_at: string | null;
}

export function GlobalAdminNotification() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load active notifications
  useEffect(() => {
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setNotifications(data);
      }
    };

    loadNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-notifications-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 5));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const updated = payload.new as AdminNotification & { is_active: boolean };
          if (!updated.is_active) {
            setNotifications(prev => prev.filter(n => n.id !== updated.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check for expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => 
        prev.filter(n => !n.expires_at || new Date(n.expires_at) > new Date())
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  const typeStyles: Record<string, { bg: string; border: string; icon: JSX.Element }> = {
    info: {
      bg: 'from-blue-600/90 to-blue-800/90',
      border: 'border-blue-400/50',
      icon: <Info className="w-5 h-5 text-blue-200" />
    },
    warning: {
      bg: 'from-yellow-600/90 to-orange-700/90',
      border: 'border-yellow-400/50',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-200" />
    },
    success: {
      bg: 'from-green-600/90 to-emerald-700/90',
      border: 'border-green-400/50',
      icon: <CheckCircle className="w-5 h-5 text-green-200" />
    },
    error: {
      bg: 'from-red-600/90 to-red-800/90',
      border: 'border-red-400/50',
      icon: <AlertCircle className="w-5 h-5 text-red-200" />
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => {
          const style = typeStyles[notification.type] || typeStyles.info;
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                pointer-events-auto
                bg-gradient-to-r ${style.bg}
                backdrop-blur-xl
                border ${style.border}
                rounded-xl
                shadow-2xl
                overflow-hidden
              `}
            >
              {/* Animated glow effect */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
              </div>

              <div className="relative p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-2 bg-white/10 rounded-lg">
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-3 h-3 text-white/60" />
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                        Admin Mitteilung
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm leading-relaxed break-words">
                      {notification.message}
                    </p>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white/80" />
                  </button>
                </div>
              </div>

              {/* Progress bar for expiring notifications */}
              {notification.expires_at && (
                <div className="h-1 bg-white/10">
                  <motion.div
                    className="h-full bg-white/40"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{
                      duration: Math.max(0, (new Date(notification.expires_at).getTime() - Date.now()) / 1000),
                      ease: 'linear'
                    }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
