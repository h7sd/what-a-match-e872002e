import { useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Clock, Zap, Loader2, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useClaimBadge, useUserBadges, useGlobalBadges } from '@/hooks/useBadges';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export function EarlyBadgeCountdown() {
  const { user } = useAuth();
  const { data: userBadges = [] } = useUserBadges(user?.id || '');
  const { data: globalBadges = [] } = useGlobalBadges();
  const claimBadge = useClaimBadge();
  const { toast } = useToast();
  
  const [isClaiming, setIsClaiming] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 500, damping: 100 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 100 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Find the EARLY badge
  const earlyBadge = globalBadges.find(b => b.name.toLowerCase() === 'early');
  const hasEarlyBadge = userBadges.some(ub => ub.badge_id === earlyBadge?.id);
  
  const maxClaims = earlyBadge?.max_claims ?? 100;
  const claimedCount = earlyBadge?.claims_count ?? 0;
  const remainingClaims = Math.max(0, maxClaims - claimedCount);
  const isSoldOut = remainingClaims === 0;

  const handleClaim = async () => {
    if (!earlyBadge || hasEarlyBadge || isSoldOut) return;

    setIsClaiming(true);
    try {
      await claimBadge.mutateAsync(earlyBadge.id);
      toast({ title: 'EARLY badge claimed!', description: 'Welcome to the early supporters club!' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to claim badge', variant: 'destructive' });
    } finally {
      setIsClaiming(false);
    }
  };

  // Don't show if no EARLY badge exists
  if (!earlyBadge) return null;

  // Don't show if user already has the badge
  if (hasEarlyBadge) {
    return (
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="group relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/5 backdrop-blur-xl p-6"
      >
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(34, 197, 94, 0.15), transparent 40%)`,
          }}
        />
        
        <div className="relative z-10 flex items-center gap-4">
          <motion.div 
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center border border-green-500/30"
            animate={{ 
              boxShadow: ['0 0 20px rgba(34, 197, 94, 0.3)', '0 0 40px rgba(34, 197, 94, 0.5)', '0 0 20px rgba(34, 197, 94, 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-7 h-7 text-green-400" />
          </motion.div>
          <div>
            <h3 className="font-bold text-green-400 text-lg">EARLY Badge Claimed!</h3>
            <p className="text-sm text-white/50">You're an early supporter 🎉</p>
          </div>
        </div>
        
        {/* Sparkle decorations */}
        <motion.div
          className="absolute top-4 right-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-5 h-5 text-green-400/40" />
        </motion.div>
      </motion.div>
    );
  }

  // Show sold out state
  if (isSoldOut) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-transparent to-red-500/5 backdrop-blur-xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
            <Clock className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-red-400 text-lg">EARLY Badge Sold Out</h3>
            <p className="text-sm text-white/50">All {maxClaims} badges have been claimed</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/5 backdrop-blur-xl p-6 space-y-5"
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(234, 179, 8, 0.1), transparent 40%)`,
        }}
      />
      
      <div className="relative z-10 flex items-center gap-2">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap className="w-5 h-5 text-yellow-400" />
        </motion.div>
        <h3 className="font-bold text-yellow-400">Claim EARLY Badge</h3>
      </div>

      <p className="relative z-10 text-sm text-white/50">
        Be an early supporter! Only {maxClaims} badges available.
      </p>

      {/* Claims Progress */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="bg-black/40 rounded-xl p-4 border border-yellow-500/20 backdrop-blur">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              <span className="text-3xl font-bold text-yellow-400">
                {claimedCount}
              </span>
            </div>
          </div>
          <span className="text-xs text-white/40 mt-2 block">Claimed</span>
        </motion.div>
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="bg-black/40 rounded-xl p-4 border border-green-500/20 backdrop-blur">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-3xl font-bold text-green-400">
                {remainingClaims}
              </span>
            </div>
          </div>
          <span className="text-xs text-white/40 mt-2 block">Remaining</span>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full bg-black/40 rounded-full h-2 border border-yellow-500/20 overflow-hidden">
        <motion.div 
          className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500"
          style={{ 
            width: `${(claimedCount / maxClaims) * 100}%`,
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <motion.div 
        className="relative z-10"
        whileHover={{ scale: 1.02 }} 
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 hover:opacity-90 font-semibold shadow-lg shadow-yellow-500/20"
          style={{ backgroundSize: '200% 100%' }}
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Claim Now
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
