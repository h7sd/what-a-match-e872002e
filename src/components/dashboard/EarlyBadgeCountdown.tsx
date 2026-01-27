import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useClaimBadge, useUserBadges, useGlobalBadges } from '@/hooks/useBadges';
import { useToast } from '@/hooks/use-toast';

// Set the deadline to 1 month from now (or a fixed date you want)
// For demo purposes, let's set it to a specific date
const EARLY_BADGE_DEADLINE = new Date('2026-02-27T00:00:00Z');

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(): TimeLeft {
  const now = new Date();
  const difference = EARLY_BADGE_DEADLINE.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function EarlyBadgeCountdown() {
  const { user } = useAuth();
  const { data: userBadges = [] } = useUserBadges(user?.id || '');
  const { data: globalBadges = [] } = useGlobalBadges();
  const claimBadge = useClaimBadge();
  const { toast } = useToast();
  
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isClaiming, setIsClaiming] = useState(false);

  // Find the EARLY badge
  const earlyBadge = globalBadges.find(b => b.name.toLowerCase() === 'early');
  const hasEarlyBadge = userBadges.some(ub => ub.badge_id === earlyBadge?.id);
  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClaim = async () => {
    if (!earlyBadge || hasEarlyBadge || isExpired) return;

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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-green-500/30 bg-green-500/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-green-400">EARLY Badge Claimed!</h3>
            <p className="text-sm text-muted-foreground">You're an early supporter 🎉</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show expired state
  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-red-500/30 bg-red-500/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-red-400">EARLY Badge Expired</h3>
            <p className="text-sm text-muted-foreground">The claiming period has ended</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-4 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/5"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-yellow-400">Claim EARLY Badge</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Be an early supporter! This badge is only claimable for a limited time.
      </p>

      {/* Countdown Timer */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Mins', value: timeLeft.minutes },
          { label: 'Secs', value: timeLeft.seconds },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="bg-black/40 rounded-lg p-2 border border-yellow-500/20">
              <span className="text-xl sm:text-2xl font-bold text-yellow-400">
                {String(item.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleClaim}
        disabled={isClaiming}
        className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400"
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
  );
}
