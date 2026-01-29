import { memo, useMemo } from 'react';
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

// Memoized profile card for performance
const ProfileCard = memo(function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link 
      to={`/${profile.username}`}
      className="flex items-center gap-3 group"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Avatar */}
      <div
        className="relative transition-transform duration-150 group-hover:scale-105"
        style={{ willChange: 'transform' }}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name || profile.username}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-primary/50 transition-colors duration-150"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#1a1a2e] border-2 border-white/10 group-hover:border-primary/50 transition-colors duration-150 flex items-center justify-center">
            <span className="text-muted-foreground text-lg font-medium">
              {(profile.display_name || profile.username).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      {/* Name & Username */}
      <div className="text-left">
        <p className="text-foreground font-semibold text-sm group-hover:text-primary transition-colors duration-150 leading-tight">
          {profile.display_name || profile.username}
        </p>
        <p className="text-muted-foreground text-xs">
          /{profile.username}
        </p>
      </div>
    </Link>
  );
});

export const FeaturedProfiles = memo(function FeaturedProfiles() {
  const { data: profiles, isLoading } = useRandomProfiles();

  // Memoize duplicated profiles
  const duplicatedProfiles = useMemo(() => {
    if (!profiles) return [];
    return [...profiles, ...profiles];
  }, [profiles]);

  if (isLoading || !profiles || profiles.length === 0) {
    return null;
  }

  return (
    <FadeIn delay={0.3}>
      <section className="py-16">
        {/* Infinite scroll container with fade edges - GPU accelerated */}
        <div 
          className="relative flex items-center justify-center overflow-hidden max-w-7xl mx-auto"
          style={{
            maskImage: 'linear-gradient(to right, transparent, white 20%, white 80%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 20%, white 80%, transparent)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          <ul 
            className="flex w-max min-w-full shrink-0 flex-nowrap py-4 gap-12 animate-scroll hover:[animation-play-state:paused]"
            style={{
              animationDirection: 'forwards',
              animationDuration: '50s',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
            {duplicatedProfiles.map((profile, index) => (
              <li key={`${profile.id}-${index}`} className="flex-shrink-0">
                <ProfileCard profile={profile} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </FadeIn>
  );
});
