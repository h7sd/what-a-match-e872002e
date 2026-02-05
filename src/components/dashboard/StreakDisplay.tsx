import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useStreak, STREAK_MILESTONES, getNextMilestone, getCurrentMilestone } from '@/hooks/useStreak';
import { Progress } from '@/components/ui/progress';
import { AnimatedFlame } from './AnimatedFlame';

export function StreakDisplay() {
  const { streak, isLoading, streakUpdated } = useStreak();

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card/50 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-2" />
        <div className="h-10 bg-muted rounded w-1/2" />
      </div>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalLogins = streak?.total_logins || 0;
  
  const currentMilestone = getCurrentMilestone(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);
  
  const progressToNext = nextMilestone 
    ? Math.min(100, (currentStreak / nextMilestone.days) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Main Streak Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        {/* Streak Updated Animation */}
        <AnimatePresence>
          {streakUpdated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30"
            >
              +1 Day! 🎉
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          {/* Animated Flame */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-orange-500/30 overflow-hidden">
              <AnimatedFlame size="md" isActive={currentStreak > 0} />
            </div>
            {currentMilestone && (
              <div 
                className="absolute -bottom-1 -right-1 text-lg"
                title={currentMilestone.label}
              >
                {currentMilestone.icon}
              </div>
            )}
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {nextMilestone && currentStreak < nextMilestone.days && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Next: {nextMilestone.label}</span>
              <span className="text-primary font-medium">
                {nextMilestone.days - currentStreak} days left
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Longest Streak</span>
          </div>
          <p className="text-2xl font-bold">{longestStreak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs">Total Logins</span>
          </div>
          <p className="text-2xl font-bold">{totalLogins}</p>
        </div>
      </div>

      {/* Milestone Badges */}
      <div className="p-4 rounded-xl border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Milestones</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {STREAK_MILESTONES.map((milestone) => {
            const isAchieved = currentStreak >= milestone.days;
            return (
              <div
                key={milestone.days}
                className={`
                  px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all
                  ${isAchieved 
                    ? 'bg-primary/20 border border-primary/30 text-primary' 
                    : 'bg-muted/30 border border-muted text-muted-foreground opacity-50'
                  }
                `}
                title={milestone.label}
              >
                <span>{milestone.icon}</span>
                <span className="text-xs font-medium">{milestone.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
