import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { GlobalBadge } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UserBadgeWithEnabled {
  id: string;
  badge_id: string;
  is_enabled: boolean;
  badge: GlobalBadge;
}

interface UserBadgesListProps {
  userBadges: UserBadgeWithEnabled[];
  userId: string;
}

export function UserBadgesList({ userBadges, userId }: UserBadgesListProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleToggle = async (userBadgeId: string, currentEnabled: boolean) => {
    setUpdating(userBadgeId);
    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ is_enabled: !currentEnabled })
        .eq('id', userBadgeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
      toast({ title: currentEnabled ? 'Badge deactivated' : 'Badge activated' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating badge', variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  if (userBadges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>You don't have any badges yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {userBadges.map((ub) => {
        const badge = ub.badge;
        const Icon = getBadgeIcon(badge.name);
        const isEnabled = (ub as any).is_enabled !== false;

        return (
          <motion.div
            key={ub.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              relative p-4 rounded-xl border transition-all duration-300
              ${isEnabled 
                ? 'border-primary/50 bg-primary/5' 
                : 'border-border bg-secondary/10 opacity-60'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${badge.color || '#8B5CF6'}20` }}
              >
                {badge.icon_url ? (
                  <img src={badge.icon_url} alt={badge.name} className="w-6 h-6" />
                ) : (
                  <Icon className="w-5 h-5" style={{ color: badge.color || '#8B5CF6' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{badge.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {isEnabled ? 'Visible on profile' : 'Hidden'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {updating === ub.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(ub.id, isEnabled)}
                  />
                )}
              </div>
            </div>

            {/* Status indicator */}
            <div className="absolute top-2 right-2">
              {isEnabled ? (
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-500" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-3 h-3 text-red-500" />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
