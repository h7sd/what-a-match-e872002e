import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeIn } from './FadeIn';
import { User } from 'lucide-react';

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
      
      // Shuffle and take 8 random profiles
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 8) as Profile[];
    },
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Refetch every time component mounts
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
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              className="w-12 h-12 rounded-full object-cover border border-border/30 group-hover:border-primary/50 transition-colors"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-card/60 border border-border/30 group-hover:border-primary/50 transition-colors flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </motion.div>
        
        <div className="text-left">
          <p className="text-foreground font-medium text-sm group-hover:text-primary transition-colors leading-tight">
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

  return (
    <FadeIn delay={0.4}>
      <section className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            trust <span className="text-primary">uservault.cc</span>
          </h2>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-8 md:gap-12 px-4 min-w-max mx-auto">
            {profiles.map((profile, index) => (
              <ProfileCard key={profile.id} profile={profile} index={index} />
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
