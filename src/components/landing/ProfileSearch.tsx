import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeIn } from './FadeIn';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .limit(50);
      
      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 60000,
  });
}

// Memoized floating row component
const FloatingRow = memo(function FloatingRow({ 
  profiles, 
  direction 
}: { 
  profiles: Profile[]; 
  direction: 'left' | 'right';
}) {
  // Duplicate profiles for seamless loop
  const duplicatedProfiles = useMemo(() => [...profiles, ...profiles], [profiles]);
  
  return (
    <div 
      className="flex overflow-hidden pointer-events-none"
      style={{
        maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <ul 
        className="flex shrink-0 gap-8 py-2 animate-scroll-links"
        style={{
          animationDirection: direction === 'left' ? 'normal' : 'reverse',
          animationDuration: '70s',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        {duplicatedProfiles.map((profile, i) => (
          <li key={`${profile.id}-${i}`} className="shrink-0">
            <span className="text-muted-foreground/40 whitespace-nowrap text-sm">
              uservault.cc/@{profile.username}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const ProfileSearch = memo(function ProfileSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const navigate = useNavigate();
  const { data: profiles } = useAllProfiles();

  // Shuffle profiles for floating links - memoized
  const shuffledProfiles = useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort(() => Math.random() - 0.5);
  }, [profiles]);

  const topRowProfiles = useMemo(() => 
    shuffledProfiles.slice(0, Math.ceil(shuffledProfiles.length / 2)), 
    [shuffledProfiles]
  );
  
  const bottomRowProfiles = useMemo(() => 
    shuffledProfiles.slice(Math.ceil(shuffledProfiles.length / 2)), 
    [shuffledProfiles]
  );

  useEffect(() => {
    if (searchQuery.trim() && profiles) {
      const filtered = profiles.filter(p => 
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setFilteredProfiles(filtered);
    } else {
      setFilteredProfiles([]);
    }
  }, [searchQuery, profiles]);

  const handleProfileClick = useCallback((username: string) => {
    navigate(`/${username}`);
    setSearchQuery('');
    setFilteredProfiles([]);
  }, [navigate]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <FadeIn delay={0.25}>
      <section className="py-16 relative overflow-hidden">
        {/* Floating profile links - top row */}
        <div className="absolute top-4 left-0 right-0">
          <FloatingRow profiles={topRowProfiles} direction="left" />
        </div>

        {/* Floating profile links - bottom row */}
        <div className="absolute bottom-4 left-0 right-0">
          <FloatingRow profiles={bottomRowProfiles} direction="right" />
        </div>

        {/* Search bar */}
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            className="bg-primary/20 backdrop-blur-md rounded-full p-2"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ willChange: 'transform, opacity' }}
          >
            <div 
              className="bg-background/95 rounded-full px-6 py-4 flex items-center gap-3 shadow-lg"
              style={{ transform: 'translateZ(0)' }}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Search profiles..."
                className="bg-transparent border-none outline-none text-foreground flex-1 text-base placeholder:text-muted-foreground"
              />
            </div>
          </motion.div>

          {/* Search results dropdown */}
          {filteredProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-lg rounded-xl border border-border/50 overflow-hidden shadow-xl z-50"
              style={{ willChange: 'transform, opacity' }}
            >
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileClick(profile.username)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-100 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{profile.username}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </FadeIn>
  );
});
