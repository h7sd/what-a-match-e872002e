import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { GlobalBadge } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';

interface BadgesGridProps {
  globalBadges: GlobalBadge[];
  userBadgeIds: string[];
}

// Rarity color mapping
const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  common: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export function BadgesGrid({ globalBadges, userBadgeIds }: BadgesGridProps) {
  const userBadgeSet = new Set(userBadgeIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {globalBadges.map((badge) => {
        const isOwned = userBadgeSet.has(badge.id);
        const Icon = getBadgeIcon(badge.name);
        const rarity = badge.rarity || 'common';
        const rarityStyle = rarityColors[rarity] || rarityColors.common;

        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              relative p-4 rounded-xl border transition-all duration-300
              bg-black/40 backdrop-blur-sm
              ${isOwned 
                ? 'border-primary/50' 
                : 'border-white/5 hover:border-white/10'
              }
            `}
          >
            {/* Rarity Badge - Top Right */}
            {rarity !== 'common' && (
              <div 
                className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${rarityStyle.bg} ${rarityStyle.text}`}
              >
                {rarity}
              </div>
            )}

            <div className="flex items-start gap-3">
              {/* Badge Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${badge.color || '#8B5CF6'}15` }}
              >
                {badge.icon_url ? (
                  <img src={badge.icon_url} alt={badge.name} className="w-7 h-7" />
                ) : (
                  <Icon className="w-6 h-6" style={{ color: badge.color || '#8B5CF6' }} />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-8">
                <h4 className="font-semibold text-sm text-white truncate">{badge.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {badge.description || 'No description'}
                </p>
              </div>

              {/* Owned/Locked indicator - Bottom Right */}
              <div className="absolute bottom-3 right-3">
                {isOwned ? (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
