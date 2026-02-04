import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { Sparkles, Eye, MapPin, Briefcase, AtSign } from 'lucide-react';

interface ProfileWithBadges {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  views_count: number | null;
  accent_color: string | null;
  location: string | null;
  occupation: string | null;
  badges: {
    name: string;
    color: string | null;
    icon_url: string | null;
  }[];
}

function useRandomProfilesWithBadges() {
  return useQuery({
    queryKey: ['card-swap-profiles'],
    queryFn: async () => {
      // Get random profiles with more fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, views_count, accent_color, location, occupation')
        .limit(50);
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Shuffle and take 5
      const shuffled = profiles.sort(() => Math.random() - 0.5).slice(0, 5);
      
      // Get badges for each profile
      const profilesWithBadges: ProfileWithBadges[] = await Promise.all(
        shuffled.map(async (profile) => {
          const { data: userBadges } = await supabase
            .from('user_badges')
            .select(`
              badge_id,
              global_badges (
                name,
                color,
                icon_url
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_enabled', true)
            .order('display_order', { ascending: true })
            .limit(6);

          const badges = (userBadges || [])
            .map((ub: any) => ub.global_badges)
            .filter(Boolean);

          return {
            ...profile,
            badges
          };
        })
      );

      return profilesWithBadges;
    },
    staleTime: 60000,
    gcTime: 120000,
  });
}

function ProfileCardContent({ profile }: { profile: ProfileWithBadges }) {
  const accentColor = profile.accent_color || '#10b981';
  
  return (
    <Link to={`/${profile.username}`} className="block w-full h-full">
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Animated glow effect behind card */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div
          className="relative rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full"
          style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: `1px solid ${accentColor}30`,
          }}
        >
          {/* Corner sparkle decorations */}
          <motion.div
            className="absolute top-3 right-3 text-sm"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ color: accentColor }}
          >
            ✦
          </motion.div>

          {/* Gradient border glow */}
          <div
            className="absolute inset-0 rounded-2xl opacity-30"
            style={{
              background: `linear-gradient(135deg, ${accentColor}30, transparent 50%, ${accentColor}20)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center flex-1">
            {/* Avatar with glow ring */}
            <div className="mb-4 relative">
              <div 
                className="absolute -inset-1 rounded-full blur-md opacity-50"
                style={{ background: accentColor }}
              />
              <div 
                className="relative w-20 h-20 rounded-full overflow-hidden"
                style={{ 
                  boxShadow: `0 0 0 2px ${accentColor}50`
                }}
              >
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name || profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
                  >
                    {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Display Name */}
            <h3 
              className="text-xl font-bold text-white mb-1"
            >
              {profile.display_name || profile.username}
            </h3>

            {/* Username */}
            <p className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5">
              <AtSign className="w-3.5 h-3.5" />
              {profile.username}
            </p>

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-3 px-2">
                {profile.badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                    style={{
                      backgroundColor: badge.color ? `${badge.color}20` : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${badge.color || 'rgba(255,255,255,0.2)'}40`,
                      color: badge.color || '#fff',
                    }}
                  >
                    {badge.icon_url && (
                      <img src={badge.icon_url} alt="" className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-[60px]">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-muted-foreground text-xs max-w-[200px] leading-relaxed mb-3 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Location & Occupation */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mb-3">
              {profile.occupation && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{profile.occupation}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{profile.location}</span>
                </div>
              )}
            </div>

            {/* Views */}
            <div className="mt-auto flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>{(profile.views_count || 0).toLocaleString()} views</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProfileCardSwap() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { data: profiles, isLoading } = useRandomProfilesWithBadges();

  // Show skeleton loading state instead of nothing
  if (isLoading) {
    return (
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="h-8 w-32 bg-muted/20 rounded-full mb-6 animate-pulse" />
              <div className="h-12 w-3/4 bg-muted/20 rounded mb-4 animate-pulse" />
              <div className="h-6 w-1/2 bg-muted/20 rounded animate-pulse" />
            </div>
            <div className="h-[600px] flex items-center justify-center">
              <div className="w-[340px] h-[480px] bg-muted/10 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!profiles || profiles.length < 3) {
    return null;
  }

  return (
    <section ref={ref} className="py-32 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Live Profiles
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Discover amazing creators
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              Explore profiles from our community. Each one uniquely customized with badges, themes, and personal style.
            </p>
          </motion.div>

          {/* Right side - Card Swap - MUCH BIGGER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative h-[600px] md:h-[700px] flex items-center justify-center"
          >
            <CardSwap
              width={340}
              height={480}
              cardDistance={55}
              verticalDistance={65}
              delay={4500}
              pauseOnHover={true}
              skewAmount={5}
              easing="elastic"
            >
              {profiles.map((profile) => (
                <Card key={profile.id} className="!bg-transparent !border-0">
                  <ProfileCardContent profile={profile} />
                </Card>
              ))}
            </CardSwap>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
