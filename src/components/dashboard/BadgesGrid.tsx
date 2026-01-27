import { motion } from 'framer-motion';
import { Award, Gift, Star, Crown, Shield, Check, Lock, Loader2 } from 'lucide-react';
import {
  FaDiscord, FaPatreon, FaDollarSign, FaBug, FaGift, FaSnowflake, FaEgg
} from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { GlobalBadge } from '@/hooks/useBadges';

interface BadgesGridProps {
  globalBadges: GlobalBadge[];
  userBadgeIds: string[];
  onClaimBadge: (badgeId: string) => void;
  isClaimPending?: boolean;
}

// Badge type to icon/action mapping
const badgeConfig: Record<string, { icon: React.ElementType; action?: string; actionLabel?: string }> = {
  staff: { icon: Shield, action: undefined, actionLabel: undefined },
  helper: { icon: FaDiscord, action: 'join_discord', actionLabel: 'Join Discord' },
  premium: { icon: Crown, action: 'purchase', actionLabel: 'Purchase' },
  verified: { icon: Check, action: 'unlock', actionLabel: 'Unlock' },
  donor: { icon: FaDollarSign, action: 'donate', actionLabel: 'Donate' },
  gifter: { icon: FaGift, action: 'gift', actionLabel: 'Gift' },
  'image host': { icon: Award, action: 'purchase', actionLabel: 'Purchase' },
  'domain legend': { icon: Star, action: 'add_domain', actionLabel: 'Add Domain' },
  og: { icon: Star, action: undefined, actionLabel: undefined },
  'server booster': { icon: FaDiscord, action: 'boost', actionLabel: 'Boost' },
  'hone.gg': { icon: Star, action: 'unlock', actionLabel: 'Unlock' },
  'bug hunter': { icon: FaBug, action: 'report', actionLabel: 'Report' },
  'christmas 2025': { icon: FaSnowflake, action: undefined, actionLabel: undefined },
  'easter 2025': { icon: FaEgg, action: undefined, actionLabel: undefined },
  'christmas 2024': { icon: FaSnowflake, action: undefined, actionLabel: undefined },
  'the million': { icon: Crown, action: undefined, actionLabel: undefined },
  winner: { icon: Crown, action: undefined, actionLabel: undefined },
  'second place': { icon: Award, action: undefined, actionLabel: undefined },
  'third place': { icon: Award, action: undefined, actionLabel: undefined },
};

export function BadgesGrid({ globalBadges, userBadgeIds, onClaimBadge, isClaimPending }: BadgesGridProps) {
  const userBadgeSet = new Set(userBadgeIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {globalBadges.map((badge) => {
        const isOwned = userBadgeSet.has(badge.id);
        const config = badgeConfig[badge.name.toLowerCase()] || { icon: Award, action: undefined, actionLabel: undefined };
        const Icon = config.icon;
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
                ) : config.actionLabel ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onClaimBadge(badge.id)}
                    disabled={isClaimPending}
                  >
                    {isClaimPending ? <Loader2 className="w-3 h-3 animate-spin" /> : config.actionLabel}
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
