import { Eye, Hash, ThumbsUp, ThumbsDown, MessageCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OverviewStatsProps {
  profileViews: number;
  uidNumber: number;
  username: string;
  profileId?: string;
}

function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + diff * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <>{displayValue.toLocaleString()}</>;
}

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  index: number;
  isNumber?: boolean;
  color?: 'primary' | 'blue' | 'amber' | 'emerald' | 'rose';
}

function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  index,
  isNumber = true,
  color = 'primary'
}: StatCardProps) {
  const colorStyles = {
    primary: {
      iconBg: 'from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20',
      iconBorder: 'border-[#00D9A5]/20 group-hover:border-[#00D9A5]/40',
      iconColor: 'text-[#00D9A5]',
    },
    blue: {
      iconBg: 'from-[#00B4D8]/20 to-[#0077B6]/20',
      iconBorder: 'border-[#00B4D8]/20 group-hover:border-[#00B4D8]/40',
      iconColor: 'text-[#00B4D8]',
    },
    amber: {
      iconBg: 'from-amber-500/20 to-amber-500/5',
      iconBorder: 'border-amber-500/20 group-hover:border-amber-500/40',
      iconColor: 'text-amber-400',
    },
    emerald: {
      iconBg: 'from-[#00D9A5]/20 to-[#00D9A5]/5',
      iconBorder: 'border-[#00D9A5]/20 group-hover:border-[#00D9A5]/40',
      iconColor: 'text-[#00D9A5]',
    },
    rose: {
      iconBg: 'from-rose-500/20 to-rose-500/5',
      iconBorder: 'border-rose-500/20 group-hover:border-rose-500/40',
      iconColor: 'text-rose-400',
    }
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5"
    >
      {/* Static gradient background instead of Aurora for performance */}
      <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500 bg-gradient-to-br from-[#00B4D8]/30 via-[#00D9A5]/20 to-[#0077B6]/30" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${styles.iconBg} flex items-center justify-center border ${styles.iconBorder} transition-colors mb-4`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">
            {isNumber && typeof value === 'number' ? (
              <AnimatedNumber value={value} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm text-white/40">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function OverviewStats({ profileViews, uidNumber, username, profileId }: OverviewStatsProps) {
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profileId) return;

      try {
        // Fetch likes/dislikes from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('likes_count, dislikes_count')
          .eq('id', profileId)
          .single();

        if (profileData) {
          setLikesCount(profileData.likes_count || 0);
          setDislikesCount(profileData.dislikes_count || 0);
        }

        // Fetch comments count
        const { data: commentsData } = await supabase.functions.invoke('profile-comment', {
          body: { action: 'get_count' }
        });
        if (commentsData?.count !== undefined) {
          setCommentsCount(commentsData.count);
        }

        // Fetch link clicks
        const { data: linksData } = await supabase
          .from('social_links')
          .select('click_count')
          .eq('profile_id', profileId);

        if (linksData) {
          const totalClicks = linksData.reduce((sum, link) => sum + (link.click_count || 0), 0);
          setLinkClicks(totalClicks);
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      }
    };

    fetchStats();
  }, [profileId]);

  return (
    <div className="space-y-4">
      {/* Main stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          icon={Eye} 
          value={profileViews} 
          label="Profile Views" 
          index={0}
          color="primary"
        />
        <StatCard 
          icon={Hash} 
          value={`#${uidNumber}`} 
          label="User ID" 
          index={1}
          isNumber={false}
          color="blue"
        />
        <StatCard 
          icon={ThumbsUp} 
          value={likesCount} 
          label="Likes" 
          index={2}
          color="emerald"
        />
        <StatCard 
          icon={ThumbsDown} 
          value={dislikesCount} 
          label="Dislikes" 
          index={3}
          color="rose"
        />
        <StatCard 
          icon={MessageCircle} 
          value={commentsCount} 
          label="Comments" 
          index={4}
          color="amber"
        />
        <StatCard 
          icon={TrendingUp} 
          value={linkClicks} 
          label="Link Clicks" 
          index={5}
          color="blue"
        />
      </div>
    </div>
  );
}
