import { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
  type PublicBadge,
  type PublicProfile,
  type FeaturedProfile,
} from "@/lib/api";

type SwapProfile = {
  profile: PublicProfile;
  badges: PublicBadge[];
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Fetch the pool of available usernames
function useFeaturedPool() {
  return useQuery({
    queryKey: ["landing", "card-swap", "pool"],
    queryFn: () => getFeaturedProfiles(100),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// Load a single random profile with badges
async function loadRandomProfile(
  pool: FeaturedProfile[],
  excludeUsernames: Set<string>
): Promise<SwapProfile | null> {
  const available = pool.filter((p) => !excludeUsernames.has(p.u));
  if (!available.length) return null;

  const pick = available[Math.floor(Math.random() * available.length)];
  const [profile, badges] = await Promise.all([
    getPublicProfile(pick.u),
    getProfileBadges(pick.u),
  ]);
  if (!profile) return null;
  return { profile, badges };
}

// Hook that manages rotating profiles - loads new random one when card swaps
function useRotatingProfiles(pool: FeaturedProfile[] | undefined) {
  const [profiles, setProfiles] = useState<SwapProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUsernames = useRef(new Set<string>());
  const swapIndexRef = useRef(0);

  // Initial load of 5 random profiles
  useEffect(() => {
    if (!pool || pool.length === 0) return;

    const loadInitial = async () => {
      setIsLoading(true);
      const shuffled = shuffle(pool).slice(0, 5);
      const loaded: SwapProfile[] = [];

      for (const p of shuffled) {
        const [profile, badges] = await Promise.all([
          getPublicProfile(p.u),
          getProfileBadges(p.u),
        ]);
        if (profile) {
          loaded.push({ profile, badges });
          loadedUsernames.current.add(p.u);
        }
      }

      setProfiles(loaded);
      setIsLoading(false);
    };

    loadInitial();
  }, [pool]);

  // Replace the front card with a new random profile when swap happens
  const onCardSwap = useCallback(
    async (swappedIndex: number) => {
      if (!pool || pool.length === 0) return;

      // Load a new random profile that's not currently shown
      const currentUsernames = new Set(profiles.map((p) => p.profile.username));
      const newProfile = await loadRandomProfile(pool, currentUsernames);

      if (newProfile) {
        setProfiles((prev) => {
          const updated = [...prev];
          // Replace the card that just went to the back
          updated[swappedIndex] = newProfile;
          return updated;
        });
        loadedUsernames.current.add(newProfile.profile.username);
      }
    },
    [pool, profiles]
  );

  return { profiles, isLoading, onCardSwap };
}

function ProfilePreviewBackground({ profile }: { profile: PublicProfile }) {
  // NOTE: On the real profile page this is rendered via <BackgroundEffects /> (fixed fullscreen).
  // For the swap cards we render a clipped, card-local equivalent.
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
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `0 0 50px ${accentColor}30, inset 0 0 30px ${accentColor}10` }}
      />
    </div>
  );
}

export function ProfileCardSwapExact() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const { data: pool, isLoading: poolLoading, isError } = useFeaturedPool();
  const { profiles, isLoading: profilesLoading, onCardSwap } = useRotatingProfiles(pool);

  const isLoading = poolLoading || profilesLoading;

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
            ) : isError || profiles.length < 1 ? (
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
                onCardSwap={(frontIdx) => {
                  // When a card goes to the back, load a new random profile to replace it
                  onCardSwap(frontIdx);
                }}
              >
                {profiles.map(({ profile, badges }, idx) => (
                  <Card key={`${profile.id}-${idx}`} className="!bg-transparent !border-0">
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
