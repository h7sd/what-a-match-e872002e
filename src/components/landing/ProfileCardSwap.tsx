import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-proxy-client';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { Sparkles, Eye, AtSign } from 'lucide-react';
import { OrbitingAvatar } from '@/components/profile/OrbitingAvatar';

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
  card_border_enabled: boolean | null;
  card_border_color: string | null;
  card_border_width: number | null;
  avatar_shape: string | null;
  name_font: string | null;
  glow_username: boolean | null;
  badges: {
    id: string;
    name: string;
    color: string | null;
    icon_url: string | null;
  }[];
}

function useRandomProfilesWithBadges() {
  return useQuery({
    queryKey: ['card-swap-profiles'],
    queryFn: async () => {
      // Get random profiles with full customization fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, username, display_name, avatar_url, bio, views_count, accent_color, 
          location, occupation, background_url, background_video_url, 
          profile_opacity, profile_blur, card_color, card_border_enabled,
          card_border_color, card_border_width, avatar_shape, name_font, glow_username
        `)
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
                id,
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

function MiniProfileCard({ profile }: { profile: ProfileWithBadges }) {
  const accentColor = profile.accent_color || '#8b5cf6';
  const cardColor = profile.card_color || 'rgba(0,0,0,0.6)';
  const borderEnabled = profile.card_border_enabled !== false;
  const borderColor = profile.card_border_color || accentColor;
  const borderWidth = profile.card_border_width || 1;
  const avatarShape = (profile.avatar_shape || 'circle') as 'circle' | 'rounded' | 'soft' | 'square';
  const hasBackground = profile.background_url || profile.background_video_url;
  const opacity = profile.profile_opacity ?? 80;
  const blur = profile.profile_blur ?? 12;

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
              background: `linear-gradient(145deg, ${accentColor}15, rgba(0,0,0,0.95), ${accentColor}10)`
            }}
          />
        )}

        {/* Animated glow effect behind card */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-50 blur-xl z-[-1]"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}60, transparent)`,
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

        {/* Card Content - Like real ProfileCard */}
        <div
          className="relative z-10 rounded-2xl p-6 flex flex-col h-full backdrop-blur-xl overflow-hidden"
          style={{
            backgroundColor: hasBackground ? `${cardColor}90` : cardColor,
            border: borderEnabled ? `${borderWidth}px solid ${borderColor}30` : 'none',
          }}
        >
          {/* Corner sparkle decorations - matching ProfileCard */}
          <motion.div
            className="absolute top-4 right-4 text-lg"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ color: accentColor }}
          >
            ✦
          </motion.div>
          <motion.div
            className="absolute bottom-4 right-4 text-lg"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            style={{ color: accentColor }}
          >
            ✦
          </motion.div>

          {/* Gradient border glow */}
          <div
            className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${accentColor}30, transparent 50%, ${accentColor}20)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center">
            {/* Avatar with OrbitingAvatar component - like real profile */}
            {profile.avatar_url && (
              <div className="mb-5">
                <OrbitingAvatar
                  avatarUrl={profile.avatar_url}
                  displayName={profile.display_name || profile.username}
                  size={100}
                  accentColor={accentColor}
                  shape={avatarShape}
                />
              </div>
            )}

            {/* Fallback avatar if no image */}
            {!profile.avatar_url && (
              <div className="mb-5 relative">
                <div 
                  className="absolute -inset-2 rounded-full blur-lg opacity-50"
                  style={{ background: accentColor }}
                />
                <div 
                  className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold"
                  style={{ 
                    backgroundColor: `${accentColor}30`, 
                    color: accentColor,
                    boxShadow: `0 0 20px ${accentColor}40`
                  }}
                >
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Display Name - with font from profile */}
            <h3 
              className="text-2xl font-bold text-white mb-1 drop-shadow-lg"
              style={{ 
                fontFamily: profile.name_font || 'Inter',
                textShadow: profile.glow_username ? `0 0 20px ${accentColor}` : undefined
              }}
            >
              {profile.display_name || profile.username}
            </h3>

            {/* Username */}
            <p className="text-muted-foreground text-sm mb-4 flex items-center gap-0.5">
              <AtSign className="w-4 h-4" />
              {profile.username}
            </p>

            {/* Badges - matching ProfileCard style */}
            {profile.badges.length > 0 && (
              <div className="inline-flex items-center justify-center -space-x-1 mb-4 px-2.5 py-1 rounded-full border border-white/10 bg-black/20 backdrop-blur-sm">
                {profile.badges.slice(0, 5).map((badge) => (
                  <div
                    key={badge.id}
                    className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-black/50"
                    style={{
                      backgroundColor: badge.color ? `${badge.color}30` : 'rgba(255,255,255,0.1)',
                      boxShadow: badge.color ? `0 0 8px ${badge.color}40` : undefined
                    }}
                    title={badge.name}
                  >
                    {badge.icon_url ? (
                      <img src={badge.icon_url} alt={badge.name} className="w-4 h-4" />
                    ) : (
                      <span className="text-xs" style={{ color: badge.color || '#fff' }}>
                        {badge.name.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {profile.badges.length > 5 && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-black/50 bg-white/5 text-xs text-muted-foreground">
                    +{profile.badges.length - 5}
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-muted-foreground text-sm max-w-[260px] leading-relaxed mb-4 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Views - at bottom */}
            <div className="mt-auto pt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>{(profile.views_count || 0).toLocaleString()} views</span>
            </div>
          </div>
        </div>

        {/* Hover effect */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 40px ${accentColor}30, inset 0 0 20px ${accentColor}10`
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

          {/* Right side - Card Swap */}
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
                  <MiniProfileCard profile={profile} />
                </Card>
              ))}
            </CardSwap>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
