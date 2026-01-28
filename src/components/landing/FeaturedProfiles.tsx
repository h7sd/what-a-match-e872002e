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
    queryKey: ['featured-profiles', Date.now()], // Force refetch on page load
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .limit(50);
      
      if (error) throw error;
      
      // Shuffle and take 8 random profiles
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 8) as Profile[];
    },
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });
}

function ProfileCard({ profile, index }: { profile: Profile; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link 
        to={`/${profile.username}`}
        className="flex flex-col items-center gap-2 group"
      >
        <motion.div
          className="relative"
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-border/50 group-hover:border-primary/50 transition-colors"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-card/60 border-2 border-border/50 group-hover:border-primary/50 transition-colors flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </motion.div>
        
        <div className="text-center">
          <p className="text-foreground font-medium text-sm group-hover:text-primary transition-colors">
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
      <section className="py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            trust <span className="text-primary">uservault.cc</span>
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {profiles.map((profile, index) => (
            <ProfileCard key={profile.id} profile={profile} index={index} />
          ))}
        </div>
      </section>
    </FadeIn>
  );
}
