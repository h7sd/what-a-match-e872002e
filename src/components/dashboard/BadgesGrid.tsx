import { motion } from 'framer-motion';
import { Award, Check, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalBadge } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';

interface BadgesGridProps {
  globalBadges: GlobalBadge[];
  userBadgeIds: string[];
  onClaimBadge: (badgeId: string) => void;
  isClaimPending?: boolean;
}

// Keep action labels local to dashboard UI
const badgeActionLabelByName: Record<string, string | undefined> = {
  helper: 'Join Discord',
  premium: 'Purchase',
  verified: 'Unlock',
  donor: 'Donate',
  gifter: 'Gift',
  'image host': 'Purchase',
  'domain legend': 'Add Domain',
  'server booster': 'Boost',
  'hone.gg': 'Unlock',
  'bug hunter': 'Report',
};

export function BadgesGrid({ globalBadges, userBadgeIds, onClaimBadge, isClaimPending }: BadgesGridProps) {
  const userBadgeSet = new Set(userBadgeIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {globalBadges.map((badge) => {
        const isOwned = userBadgeSet.has(badge.id);
        const Icon = getBadgeIcon(badge.name);
        const actionLabel = badgeActionLabelByName[badge.name.toLowerCase()];
        const isLimited = badge.is_limited && badge.max_claims && (badge.claims_count || 0) >= badge.max_claims;

        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              relative p-4 rounded-xl border transition-all duration-300
              ${isOwned 
                ? 'border-primary/50 bg-primary/5' 
                : 'border-border bg-secondary/10 hover:bg-secondary/20'
              }
            `}
          >
            {/* Badge Icon */}
            <div className="flex items-start gap-3">
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
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {badge.description || 'No description'}
                </p>
              </div>

              {/* Owned indicator */}
              {isOwned && (
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>

            {/* Action Button */}
            {!isOwned && (
              <div className="mt-3">
                {isLimited ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Lock className="w-3 h-3 mr-1" />
                    Sold Out
                  </Button>
                ) : actionLabel ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onClaimBadge(badge.id)}
                    disabled={isClaimPending}
                  >
                    {isClaimPending ? <Loader2 className="w-3 h-3 animate-spin" /> : actionLabel}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onClaimBadge(badge.id)}
                    disabled={isClaimPending}
                  >
                    {isClaimPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                  </Button>
                )}
              </div>
            )}

            {/* Rarity indicator */}
            {badge.rarity && badge.rarity !== 'common' && (
              <div 
                className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                style={{ 
                  backgroundColor: `${badge.color || '#8B5CF6'}20`,
                  color: badge.color || '#8B5CF6'
                }}
              >
                {badge.rarity}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
