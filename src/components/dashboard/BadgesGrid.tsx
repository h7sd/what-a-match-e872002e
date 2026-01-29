import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, X, Hash } from 'lucide-react';
import { GlobalBadge } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';

interface BadgesGridProps {
  globalBadges: GlobalBadge[];
  userBadgeIds: string[];
  userUid?: number;
}

// Rarity color mapping
const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  common: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export function BadgesGrid({ globalBadges, userBadgeIds, userUid }: BadgesGridProps) {
  const userBadgeSet = new Set(userBadgeIds);
  const [selectedBadge, setSelectedBadge] = useState<GlobalBadge | null>(null);

  return (
    <>
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
              onClick={() => setSelectedBadge(badge)}
              className={`
                relative p-4 rounded-xl border transition-all duration-300 cursor-pointer
                bg-black/40 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]
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

      {/* Mobile Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm p-6 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedBadge.color || '#8B5CF6'}20` }}
                >
                  {selectedBadge.icon_url ? (
                    <img src={selectedBadge.icon_url} alt={selectedBadge.name} className="w-10 h-10" />
                  ) : (
                    (() => {
                      const BadgeIcon = getBadgeIcon(selectedBadge.name);
                      return <BadgeIcon className="w-8 h-8" style={{ color: selectedBadge.color || '#8B5CF6' }} />;
                    })()
                  )}
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{selectedBadge.name}</h3>
              
              {selectedBadge.rarity && selectedBadge.rarity !== 'common' && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full capitalize font-medium mb-3 ${rarityColors[selectedBadge.rarity]?.bg} ${rarityColors[selectedBadge.rarity]?.text}`}>
                  {selectedBadge.rarity}
                </span>
              )}

              <p className="text-sm text-muted-foreground mb-4">
                {selectedBadge.description || 'No description available.'}
              </p>

              {/* Show UID if provided */}
              {userUid && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Your UID:</span>
                  <span className="font-mono font-bold text-primary">#{userUid}</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                {userBadgeSet.has(selectedBadge.id) ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">You own this badge</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">Admin-assigned only</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
