import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { Sparkles } from "lucide-react";

import CardSwap, { Card } from "@/components/ui/CardSwap";
import { ProfileCard } from "@/components/profile/ProfileCard";
import {
  getFeaturedProfiles,
  getProfileBadges,
  getPublicProfile,
  type FeaturedProfile,
  type PublicBadge,
  type PublicProfile,
} from "@/lib/api";

type SwapProfile = {
  profile: PublicProfile;
  badges: PublicBadge[];
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Check if profile has a valid background
function hasBackground(profile: PublicProfile): boolean {
  return !!(profile.background_url || profile.background_video_url);
}

// Hook to manage dynamic profile loading with replacement on swap
function useDynamicProfiles() {
  const poolRef = useRef<FeaturedProfile[]>([]);
  const usedUsernames = useRef<Set<string>>(new Set());

  // Load the pool of featured profiles
  const { data: pool } = useQuery({
    queryKey: ["landing", "card-swap", "pool"],
    queryFn: async () => {
      const featured = await getFeaturedProfiles(100);
      return shuffle(featured);
    },
    staleTime: 60_000,
    gcTime: 120_000,
    refetchOnWindowFocus: false,
  });

  // Track pool in ref for replacement logic
  useEffect(() => {
    if (pool) {
      poolRef.current = pool;
    }
  }, [pool]);

  // State for active profiles shown in the carousel
  const [activeProfiles, setActiveProfiles] = useState<SwapProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load a single profile with background check
  const loadProfile = useCallback(async (username: string): Promise<SwapProfile | null> => {
    try {
      const [profile, badges] = await Promise.all([
        getPublicProfile(username),
        getProfileBadges(username),
      ]);
      if (!profile || !hasBackground(profile)) return null;
      return { profile, badges };
    } catch {
      return null;
    }
  }, []);

  // Find and load the next valid profile from the pool
  const getNextProfile = useCallback(async (): Promise<SwapProfile | null> => {
    const available = poolRef.current.filter(p => !usedUsernames.current.has(p.u));
    
    for (const candidate of available) {
      usedUsernames.current.add(candidate.u);
      const loaded = await loadProfile(candidate.u);
      if (loaded) return loaded;
    }
    
    // If we've exhausted the pool, reset and try again
    usedUsernames.current.clear();
    activeProfiles.forEach(p => usedUsernames.current.add(p.profile.username));
    
    return null;
  }, [loadProfile, activeProfiles]);

  // Initial load of 5 profiles with backgrounds
  useEffect(() => {
    if (!pool || pool.length === 0) return;

    const loadInitial = async () => {
      setIsLoading(true);
      const loaded: SwapProfile[] = [];
      
      for (const candidate of pool) {
        if (loaded.length >= 5) break;
        usedUsernames.current.add(candidate.u);
        const profile = await loadProfile(candidate.u);
        if (profile) {
          loaded.push(profile);
        }
      }

      setActiveProfiles(loaded);
      setIsLoading(false);
    };

    loadInitial();
  }, [pool, loadProfile]);

  // Replace a profile at a given index with a new one
  const replaceProfile = useCallback(async (index: number) => {
    const newProfile = await getNextProfile();
    if (!newProfile) return;

    setActiveProfiles(prev => {
      const updated = [...prev];
      // Remove old username from used set
      if (updated[index]) {
        usedUsernames.current.delete(updated[index].profile.username);
      }
      updated[index] = newProfile;
      return updated;
    });
  }, [getNextProfile]);

  return {
    profiles: activeProfiles,
    isLoading,
    replaceProfile,
  };
}

function ProfilePreviewBackground({ profile }: { profile: PublicProfile }) {
  const accent = profile.accent_color || "#8b5cf6";
  const bg = profile.background_color || "#0a0a0a";

  return (
    <div className="absolute inset-0">
      {profile.background_video_url ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={profile.background_video_url} type="video/mp4" />
          <source src={profile.background_video_url} type="video/quicktime" />
        </video>
      ) : profile.background_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${profile.background_url})` }}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: bg }} />
      )}

      {/* Same overlay vibe as the real profile page */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}30, transparent 60%)`,
        }}
      />
    </div>
  );
}

function ProfilePageCardPreview({ data }: { data: SwapProfile }) {
  const { profile, badges } = data;
  const accentColor = profile.accent_color || "#8B5CF6";

  const mappedBadges = useMemo(
    () =>
      badges.map((b) => ({
        id: b.id || b.name,
        name: b.name,
        color: b.custom_color || b.color,
        icon_url: b.icon_url,
      })),
    [badges]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <ProfilePreviewBackground profile={profile} />

      {/* Content layer */}
      <div className="relative z-10 flex h-full w-full items-center justify-center p-6">
        <div className="w-full">
          <ProfileCard
            profile={{ ...profile, accent_color: accentColor } as any}
            badges={mappedBadges}
            showUsername={profile.show_username ?? true}
            showDisplayName={profile.show_display_name ?? true}
            showBadges={profile.show_badges ?? true}
            showViews={profile.show_views ?? true}
            showAvatar={profile.show_avatar ?? true}
            showDescription={profile.show_description ?? true}
            borderEnabled={profile.card_border_enabled ?? true}
            borderColor={profile.card_border_color}
            borderWidth={profile.card_border_width ?? 1}
            transparentBadges={profile.transparent_badges ?? false}
            isOwnProfile={false}
          />
        </div>
      </div>

      {/* Hover ring */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
        style={{ boxShadow: `0 0 50px ${accentColor}30, inset 0 0 30px ${accentColor}10` }}
      />
    </div>
  );
}

export function ProfileCardSwapExact() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const { profiles, isLoading, replaceProfile } = useDynamicProfiles();

  // When a card swaps to the back, replace it with a new profile
  const handleCardSwap = useCallback((frontIdx: number) => {
    replaceProfile(frontIdx);
  }, [replaceProfile]);

  return (
    <section ref={ref} className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
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
              Genau so gerendert wie auf der Profilseite – mit denselben Effekten, Fonts, Badges und Card-Settings.
            </p>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative h-[700px] md:h-[800px] flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-[420px] h-[600px] bg-muted/10 rounded-2xl animate-pulse" />
            ) : profiles.length < 1 ? (
              <div className="w-[420px] h-[600px] rounded-2xl border border-border bg-card/30 backdrop-blur-sm flex items-center justify-center p-10 text-center">
                <div>
                  <p className="text-foreground font-semibold mb-2">Keine Profiles verfügbar</p>
                  <p className="text-muted-foreground text-sm">Sobald welche da sind, erscheinen sie hier automatisch.</p>
                </div>
              </div>
            ) : (
              <CardSwap
                width={420}
                height={600}
                cardDistance={65}
                verticalDistance={75}
                delay={5000}
                pauseOnHover={true}
                skewAmount={4}
                easing="elastic"
                onCardSwap={handleCardSwap}
              >
                {profiles.map(({ profile, badges }) => (
                  <Card key={profile.id} className="!bg-transparent !border-0">
                    <Link
                      to={`/${profile.username}`}
                      className="group block w-full h-full"
                      aria-label={`Open profile ${profile.username}`}
                    >
                      <ProfilePageCardPreview data={{ profile, badges }} />
                    </Link>
                  </Card>
                ))}
              </CardSwap>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
