import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeIn } from './FadeIn';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

function useRandomProfiles() {
  return useQuery({
    queryKey: ['featured-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .limit(100);
      
      if (error) throw error;
      
      // Shuffle and take 12 random profiles for smoother infinite scroll
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 12) as Profile[];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}

function ProfileCard({ profile, index }: { profile: Profile; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex-shrink-0"
    >
      <Link 
        to={`/${profile.username}`}
        className="flex items-center gap-3 group"
      >
        {/* Avatar */}
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-primary/50 transition-colors"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1a1a2e] border-2 border-white/10 group-hover:border-primary/50 transition-colors flex items-center justify-center">
              <span className="text-muted-foreground text-lg font-medium">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>
        
        {/* Name & Username */}
        <div className="text-left">
          <p className="text-foreground font-semibold text-sm group-hover:text-primary transition-colors leading-tight">
            {profile.display_name || profile.username}
          </p>
          <p className="text-muted-foreground text-xs">
            /{profile.username}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturedProfiles() {
  const { data: profiles, isLoading } = useRandomProfiles();

  if (isLoading || !profiles || profiles.length === 0) {
    return null;
  }

  // Duplicate profiles for seamless infinite scroll
  const duplicatedProfiles = [...profiles, ...profiles];

  return (
    <FadeIn delay={0.4}>
      <section className="py-16">
        {/* Infinite scroll container with fade edges */}
        <div 
          className="relative flex items-center justify-center overflow-hidden max-w-7xl mx-auto"
          style={{
            maskImage: 'linear-gradient(to right, transparent, white 20%, white 80%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 20%, white 80%, transparent)',
          }}
        >
          <ul 
            className="flex w-max min-w-full shrink-0 flex-nowrap py-4 gap-12 animate-scroll hover:[animation-play-state:paused]"
            style={{
              animationDirection: 'forwards',
              animationDuration: '60s',
            }}
          >
            {duplicatedProfiles.map((profile, index) => (
              <li key={`${profile.id}-${index}`} className="flex-shrink-0">
                <ProfileCard profile={profile} index={index % profiles.length} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </FadeIn>
  );
}
