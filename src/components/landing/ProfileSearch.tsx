import { useState, useEffect, useMemo } from 'react';
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

function FloatingProfileLink({ 
  username, 
  index, 
  total,
  row 
}: { 
  username: string; 
  index: number; 
  total: number;
  row: 'top' | 'bottom';
}) {
  const baseDelay = row === 'top' ? 0 : 0.5;
  const duration = 25 + (index % 3) * 5;
  const startX = row === 'top' ? '100%' : '-100%';
  const endX = row === 'top' ? '-100%' : '100%';
  
  return (
    <motion.a
      href={`/${username}`}
      className="text-muted-foreground/40 hover:text-primary/80 transition-colors whitespace-nowrap text-sm md:text-base px-4"
      initial={{ x: startX, opacity: 0 }}
      animate={{ 
        x: [startX, endX],
        opacity: [0, 0.6, 0.6, 0]
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay: baseDelay + (index * 2),
        ease: 'linear',
      }}
    >
      uservault.cc/@{username}
    </motion.a>
  );
}

export function ProfileSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
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

  const handleProfileClick = (username: string) => {
    navigate(`/${username}`);
    setSearchQuery('');
    setFilteredProfiles([]);
  };

  return (
    <FadeIn delay={0.3}>
      <section className="py-16 relative overflow-hidden">
        {/* Floating profile links - top row */}
        <div className="absolute top-4 left-0 right-0 flex items-center overflow-hidden pointer-events-none">
          {topRowProfiles.map((profile, i) => (
            <FloatingProfileLink 
              key={`top-${profile.id}`} 
              username={profile.username} 
              index={i} 
              total={topRowProfiles.length}
              row="top"
            />
          ))}
        </div>

        {/* Floating profile links - bottom row */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center overflow-hidden pointer-events-none">
          {bottomRowProfiles.map((profile, i) => (
            <FloatingProfileLink 
              key={`bottom-${profile.id}`} 
              username={profile.username} 
              index={i} 
              total={bottomRowProfiles.length}
              row="bottom"
            />
          ))}
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
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileClick(profile.username)}
                  className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center gap-3"
                >
                  <span className="text-muted-foreground text-sm">uservault.cc/</span>
                  <span className="text-foreground font-medium">@{profile.username}</span>
                  {profile.display_name && (
                    <span className="text-muted-foreground text-sm ml-auto">{profile.display_name}</span>
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
