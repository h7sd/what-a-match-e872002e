import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProfiles, searchProfiles, FeaturedProfile, SearchResult } from '@/lib/api';
import { FadeIn } from './FadeIn';

function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles-landing'],
    queryFn: async () => {
      // Use secure API proxy
      return getFeaturedProfiles(50);
    },
    staleTime: 60000,
  });
}

function FloatingRow({ 
  profiles, 
  direction 
}: { 
  profiles: FeaturedProfile[]; 
  direction: 'left' | 'right';
}) {
  // Duplicate profiles for seamless loop
  const duplicatedProfiles = [...profiles, ...profiles];
  
  return (
    <div 
      className="flex overflow-hidden pointer-events-none"
      style={{
        maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
    >
      <ul 
        className="flex shrink-0 gap-8 py-2 animate-scroll-links"
        style={{
          animationDirection: direction === 'left' ? 'normal' : 'reverse',
          animationDuration: '80s',
        }}
      >
        {duplicatedProfiles.map((profile, i) => (
          <li key={`${profile.u}-${i}`} className="shrink-0">
            <span className="text-muted-foreground/40 whitespace-nowrap text-sm">
              uservault.cc/@{profile.u}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { data: profiles } = useAllProfiles();

  // Shuffle profiles for floating links
  const shuffledProfiles = useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort(() => Math.random() - 0.5);
  }, [profiles]);

  const topRowProfiles = shuffledProfiles.slice(0, Math.ceil(shuffledProfiles.length / 2));
  const bottomRowProfiles = shuffledProfiles.slice(Math.ceil(shuffledProfiles.length / 2));

  useEffect(() => {
    const doSearch = async () => {
      if (searchQuery.trim() && searchQuery.length >= 2) {
        // Use secure API proxy for search
        const results = await searchProfiles(searchQuery, 5);
        setFilteredProfiles(results);
      } else {
        setFilteredProfiles([]);
      }
    };

    const timeout = setTimeout(doSearch, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleProfileClick = (username: string) => {
    navigate(`/${username}`);
    setSearchQuery('');
    setFilteredProfiles([]);
  };

  return (
    <FadeIn delay={0.3}>
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-background/95 rounded-full px-6 py-4 flex items-center gap-3 shadow-lg">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search profiles..."
                className="bg-transparent border-none outline-none text-foreground flex-1 text-base placeholder:text-muted-foreground"
              />
            </div>
          </motion.div>

          {/* Search results dropdown */}
          {filteredProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden shadow-xl z-20"
            >
              {filteredProfiles.map((profile, index) => (
                <button
                  key={index}
                  onClick={() => handleProfileClick(profile.u)}
                  className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center gap-3"
                >
                  <span className="text-muted-foreground text-sm">uservault.cc/</span>
                  <span className="text-foreground font-medium">@{profile.u}</span>
                  {profile.d && (
                    <span className="text-muted-foreground text-sm ml-auto">{profile.d}</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </FadeIn>
  );
}
