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
  background_url: string | null;
  background_video_url: string | null;
  profile_opacity: number | null;
  profile_blur: number | null;
  card_color: string | null;
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
      // Get random profiles with full preview fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, views_count, accent_color, location, occupation, background_url, background_video_url, profile_opacity, profile_blur, card_color')
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
  const cardColor = profile.card_color || 'rgba(0,0,0,0.7)';
  const opacity = profile.profile_opacity ?? 80;
  const blur = profile.profile_blur ?? 12;
  const hasBackground = profile.background_url || profile.background_video_url;
  
  return (
    <Link to={`/${profile.username}`} className="block w-full h-full group">
      <div className="relative w-full h-full flex flex-col overflow-hidden rounded-2xl">
        {/* Background Layer - Image or Video */}
        {hasBackground && (
          <div className="absolute inset-0 z-0">
            {profile.background_video_url ? (
              <video
                src={profile.background_video_url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : profile.background_url ? (
              <img
                src={profile.background_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
            {/* Overlay with profile opacity */}
            <div 
              className="absolute inset-0"
              style={{ 
                backgroundColor: `rgba(0,0,0,${(100 - opacity) / 100})`,
                backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined
              }}
            />
          </div>
        )}

        {/* Fallback gradient background if no media */}
        {!hasBackground && (
          <div 
            className="absolute inset-0 z-0"
            style={{
              background: `linear-gradient(145deg, ${accentColor}20, rgba(0,0,0,0.9), ${accentColor}10)`
            }}
          />
        )}

        {/* Animated glow effect behind card */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-40 blur-2xl z-[-1]"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}60, transparent)`,
          }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Card Content */}
        <div
          className="relative z-10 rounded-2xl p-6 flex flex-col h-full"
          style={{
            backgroundColor: hasBackground ? `${cardColor}80` : cardColor,
            backdropFilter: hasBackground ? `blur(${blur}px)` : undefined,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {/* Corner sparkle decorations */}
          <motion.div
            className="absolute top-4 right-4 text-lg"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ color: accentColor }}
          >
            ✦
          </motion.div>
          <motion.div
            className="absolute bottom-4 left-4 text-sm"
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            style={{ color: accentColor }}
          >
            ✦
          </motion.div>

          {/* Gradient border glow */}
          <div
            className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40, transparent 40%, transparent 60%, ${accentColor}30)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center">
            {/* Avatar with glow ring - larger */}
            <div className="mb-5 relative">
              <div 
                className="absolute -inset-2 rounded-full blur-lg opacity-60"
                style={{ background: accentColor }}
              />
              <div 
                className="relative w-24 h-24 rounded-full overflow-hidden"
                style={{ 
                  boxShadow: `0 0 20px ${accentColor}50, 0 0 0 2px ${accentColor}60`
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
                    className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
                  >
                    {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Display Name - larger */}
            <h3 
              className="text-2xl font-bold text-white mb-1 drop-shadow-lg"
            >
              {profile.display_name || profile.username}
            </h3>

            {/* Username */}
            <p className="text-muted-foreground text-sm mb-4 flex items-center gap-0.5">
              <AtSign className="w-4 h-4" />
              {profile.username}
            </p>

            {/* Badges - larger pills */}
            {profile.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4 px-3">
                {profile.badges.slice(0, 4).map((badge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md shadow-lg"
                    style={{
                      backgroundColor: badge.color ? `${badge.color}25` : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${badge.color || 'rgba(255,255,255,0.2)'}50`,
                      color: badge.color || '#fff',
                      boxShadow: badge.color ? `0 0 10px ${badge.color}30` : undefined
                    }}
                  >
                    {badge.icon_url && (
                      <img src={badge.icon_url} alt="" className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[70px]">{badge.name}</span>
                  </div>
                ))}
                {profile.badges.length > 4 && (
                  <div className="flex items-center px-2 py-1 rounded-full text-xs text-muted-foreground bg-white/5">
                    +{profile.badges.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Bio - more space */}
            {profile.bio && (
              <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mb-4 line-clamp-3">
                {profile.bio}
              </p>
            )}

            {/* Location & Occupation */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
              {profile.occupation && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{profile.occupation}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{profile.location}</span>
                </div>
              )}
            </div>

            {/* Views - at bottom */}
            <div className="mt-auto pt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground border-t border-white/10 w-full">
              <Eye className="w-4 h-4" />
              <span>{(profile.views_count || 0).toLocaleString()} views</span>
            </div>
          </div>
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 40px ${accentColor}40, inset 0 0 20px ${accentColor}10`
          }}
        />
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
            <div className="h-[700px] flex items-center justify-center">
              <div className="w-[420px] h-[600px] bg-muted/10 rounded-2xl animate-pulse" />
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
            className="relative h-[700px] md:h-[800px] flex items-center justify-center"
          >
            <CardSwap
              width={420}
              height={600}
              cardDistance={65}
              verticalDistance={75}
              delay={5000}
              pauseOnHover={true}
              skewAmount={4}
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
