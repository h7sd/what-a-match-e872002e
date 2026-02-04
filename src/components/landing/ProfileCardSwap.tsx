import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, Heart } from 'lucide-react';

interface ProfileWithBadges {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  views_count: number | null;
  likes_count: number | null;
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
      // Get random profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, views_count, likes_count')
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
            .limit(4);

          const badges = (userBadges || [])
            .map((ub: any) => ub.global_badges)
            .filter(Boolean)
            .slice(0, 4);

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

function ProfileCard({ profile }: { profile: ProfileWithBadges }) {
  return (
    <Link to={`/${profile.username}`} className="block w-full h-full">
      <div className="relative w-full h-full p-6 flex flex-col bg-gradient-to-br from-background/95 via-card/90 to-background/95">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        
        {/* Header */}
        <div className="relative flex items-start gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-primary/30">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {(profile.display_name || profile.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg truncate">
              {profile.display_name || profile.username}
            </h3>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="relative text-muted-foreground text-sm line-clamp-2 mb-4 flex-shrink-0">
            {profile.bio}
          </p>
        )}

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div className="relative flex flex-wrap gap-2 mb-4">
            {profile.badges.map((badge, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs px-2 py-1 flex items-center gap-1"
                style={{ 
                  backgroundColor: badge.color ? `${badge.color}20` : undefined,
                  borderColor: badge.color || undefined,
                  color: badge.color || undefined
                }}
              >
                {badge.icon_url && (
                  <img src={badge.icon_url} alt="" className="w-3 h-3" />
                )}
                {badge.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="relative mt-auto flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{profile.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{profile.likes_count || 0}</span>
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

  if (isLoading || !profiles || profiles.length < 3) {
    return null;
  }

  return (
    <section ref={ref} className="py-24 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
            className="relative h-[500px] md:h-[550px] flex items-center justify-center"
          >
            <CardSwap
              width={320}
              height={380}
              cardDistance={50}
              verticalDistance={60}
              delay={4000}
              pauseOnHover={true}
              skewAmount={4}
              easing="elastic"
            >
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <ProfileCard profile={profile} />
                </Card>
              ))}
            </CardSwap>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
