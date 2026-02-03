import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Target, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { getBadgeIcon, getBadgeImage } from '@/lib/badges';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Badge {
  id: string;
  name: string;
  color: string | null;
  icon_url?: string | null;
}

interface StealableBadgeProps {
  badge: Badge;
  victimUsername: string;
  isOwnProfile: boolean;
  hasActiveStealEvent: boolean;
  activeEventId?: string | null;
  accentColor: string;
  transparentBadges?: boolean;
  onStealSuccess?: () => void;
}

export function StealableBadge({
  badge,
  victimUsername,
  isOwnProfile,
  hasActiveStealEvent,
  activeEventId = null,
  accentColor,
  transparentBadges = false,
  onStealSuccess,
}: StealableBadgeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showStealDialog, setShowStealDialog] = useState(false);
  const [isStealing, setIsStealing] = useState(false);

  const Icon = getBadgeIcon(badge.name);
  const badgeColor = transparentBadges ? 'currentColor' : (badge.color || accentColor);
  const customImage = getBadgeImage(badge.name);
  const shadowFilter = transparentBadges ? 'none' : `drop-shadow(0 0 4px ${badge.color || accentColor}50)`;
  const hoverShadow = transparentBadges ? 'none' : `drop-shadow(0 0 8px ${badge.color || accentColor})`;

  const canSteal = !isOwnProfile && hasActiveStealEvent && user;

  // Stolen badges are rendered as "Name (stolen)" in public badge list.
  // The backend expects the real badge name.
  const badgeNameForSteal = badge.name.replace(/\s*\(stolen\)\s*$/i, '');

  const handleBadgeClick = () => {
    if (canSteal) {
      setShowStealDialog(true);
    }
  };

  const handleSteal = async () => {
    if (!user) {
      toast({ title: 'You must be logged in', variant: 'destructive' });
      return;
    }

    setIsStealing(true);
    try {
      const { data, error } = await supabase.rpc('steal_badge', {
        p_victim_username: victimUsername,
        p_badge_name: badgeNameForSteal,
        p_event_id: activeEventId,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.success) {
        toast({
          title: '🎯 Badge Hunted!',
          description: `You hunted "${result.stolen_badge_name}"!`,
        });
        setShowStealDialog(false);
        onStealSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result?.message || 'Could not steal badge',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not steal badge',
        variant: 'destructive',
      });
    } finally {
      setIsStealing(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            aria-label={`Badge: ${badge.name}${canSteal ? ' (Click to steal)' : ''}`}
            className={`w-8 h-8 flex items-center justify-center cursor-pointer rounded-full touch-manipulation relative ${transparentBadges ? 'opacity-70' : ''}`}
            whileHover={{ 
              scale: 1.15,
              filter: hoverShadow,
              opacity: 1,
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={handleBadgeClick}
          >
            {badge.icon_url ? (
              <img 
                src={badge.icon_url} 
                alt={badge.name} 
                className={`w-5 h-5 object-contain ${transparentBadges ? 'opacity-80' : ''}`} 
                loading="lazy" 
              />
            ) : customImage ? (
              <img 
                src={customImage} 
                alt={badge.name} 
                className={`w-5 h-5 object-contain ${transparentBadges ? 'opacity-80' : ''}`} 
                loading="lazy" 
              />
            ) : (
              <Icon 
                className="w-5 h-5 transition-all duration-200" 
                style={{ 
                  color: badgeColor, 
                  filter: shadowFilter,
                }} 
              />
            )}

            {/* Hunt indicator when event is active */}
            {canSteal && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Target className="w-2 h-2 text-white" />
              </motion.div>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl"
          style={{ boxShadow: transparentBadges ? undefined : `0 4px 20px ${badge.color || accentColor}40` }}
        >
          <div className="flex flex-col items-center gap-1">
            <span>{badge.name}</span>
            {canSteal && (
              <span className="text-red-400 text-[10px]">🎯 Click to hunt</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Steal Confirmation Dialog */}
      <AnimatePresence>
        {showStealDialog && (
          <Dialog open={showStealDialog} onOpenChange={setShowStealDialog}>
            <DialogContent className="max-w-sm bg-black/95 border border-red-500/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-400">
                  <Target className="w-5 h-5" />
                  Hunt Badge?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Do you really want to hunt <strong className="text-white">{badge.name}</strong> from <strong className="text-white">@{victimUsername}</strong>?
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      {badge.icon_url ? (
                        <img src={badge.icon_url} alt={badge.name} className="w-8 h-8 object-contain" />
                      ) : customImage ? (
                        <img src={customImage} alt={badge.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <Icon className="w-8 h-8" style={{ color: badge.color || accentColor }} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{badge.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowStealDialog(false)}
                    disabled={isStealing}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSteal}
                    disabled={isStealing}
                  >
                    {isStealing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Hunt!
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
