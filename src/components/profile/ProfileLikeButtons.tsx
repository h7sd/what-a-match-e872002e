import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProfileLikeButtonsProps {
  username: string;
  initialLikes?: number;
  initialDislikes?: number;
  accentColor?: string;
  className?: string;
}

export function ProfileLikeButtons({
  username,
  initialLikes = 0,
  initialDislikes = 0,
  accentColor = '#8b5cf6',
  className,
}: ProfileLikeButtonsProps) {
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [dislikesCount, setDislikesCount] = useState(initialDislikes);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('profile-like', {
          body: { action: 'get_status', username }
        });

        if (!error && data) {
          setLikesCount(data.likes_count ?? initialLikes);
          setDislikesCount(data.dislikes_count ?? initialDislikes);
          setUserVote(data.user_vote);
        }
      } catch (e) {
        console.error('Failed to fetch like status:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    if (username) {
      fetchStatus();
    }
  }, [username, initialLikes, initialDislikes]);

  const handleVote = async (isLike: boolean) => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Optimistic update
    const previousLikes = likesCount;
    const previousDislikes = dislikesCount;
    const previousVote = userVote;

    // Calculate optimistic values
    if (userVote === isLike) {
      // Removing vote
      setUserVote(null);
      if (isLike) setLikesCount(prev => Math.max(0, prev - 1));
      else setDislikesCount(prev => Math.max(0, prev - 1));
    } else if (userVote === null) {
      // Adding new vote
      setUserVote(isLike);
      if (isLike) setLikesCount(prev => prev + 1);
      else setDislikesCount(prev => prev + 1);
    } else {
      // Changing vote
      setUserVote(isLike);
      if (isLike) {
        setLikesCount(prev => prev + 1);
        setDislikesCount(prev => Math.max(0, prev - 1));
      } else {
        setLikesCount(prev => Math.max(0, prev - 1));
        setDislikesCount(prev => prev + 1);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('profile-like', {
        body: { action: 'vote', username, is_like: isLike }
      });

      if (error) throw error;

      // Update with actual values from server
      if (data) {
        setLikesCount(data.likes_count);
        setDislikesCount(data.dislikes_count);
        setUserVote(data.user_vote);
      }
    } catch (e) {
      console.error('Failed to vote:', e);
      // Revert on error
      setLikesCount(previousLikes);
      setDislikesCount(previousDislikes);
      setUserVote(previousVote);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <motion.div 
      className={cn("flex items-center gap-3 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {/* Like Button */}
      <motion.button
        onClick={() => handleVote(true)}
        disabled={isLoading || isInitializing}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
          "border backdrop-blur-sm",
          userVote === true
            ? "bg-green-500/20 border-green-500/50 text-green-400"
            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Like (${likesCount})`}
      >
        <AnimatePresence mode="wait">
          {isLoading && userVote !== false ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <ThumbsUp 
                className={cn(
                  "w-4 h-4 transition-all",
                  userVote === true && "fill-current"
                )} 
              />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.span
            key={likesCount}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-sm font-medium min-w-[1.5ch]"
          >
            {isInitializing ? '-' : formatCount(likesCount)}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Dislike Button */}
      <motion.button
        onClick={() => handleVote(false)}
        disabled={isLoading || isInitializing}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
          "border backdrop-blur-sm",
          userVote === false
            ? "bg-red-500/20 border-red-500/50 text-red-400"
            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Dislike (${dislikesCount})`}
      >
        <AnimatePresence mode="wait">
          {isLoading && userVote !== true ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <ThumbsDown 
                className={cn(
                  "w-4 h-4 transition-all",
                  userVote === false && "fill-current"
                )} 
              />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.span
            key={dislikesCount}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-sm font-medium min-w-[1.5ch]"
          >
            {isInitializing ? '-' : formatCount(dislikesCount)}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}