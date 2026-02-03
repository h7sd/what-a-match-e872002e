import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Ban } from 'lucide-react';
import { useRecordProfileView } from '@/hooks/useProfile';
import { getPublicProfile, getPublicProfileByAlias, getProfileLinks, getProfileBadges, PublicProfile, PublicLink, PublicBadge } from '@/lib/api';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { BackgroundEffects } from '@/components/profile/BackgroundEffects';
import { CustomCursor } from '@/components/profile/CustomCursor';
import { DiscordPresence } from '@/components/profile/DiscordPresence';
import { StartScreen } from '@/components/profile/StartScreen';
import { SimpleVolumeBar } from '@/components/profile/SimpleVolumeBar';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';

// Custom hook for animated document title
function useAnimatedDocumentTitle(
  title: string, 
  animation: string,
  iconUrl?: string | null
) {
  const [animatedTitle, setAnimatedTitle] = useState(title);
  const frameRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  // Set favicon
  useEffect(() => {
    if (iconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    }
    return () => {
      // Reset to default favicon on unmount
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = 'https://storage.googleapis.com/gpt-engineer-file-uploads/N7OIoQRjNPSXaLFdJjQDPkdaXHs1/uploads/1769473434323-UserVault%204%20(1).png';
      }
    };
  }, [iconUrl]);

  // Animate title
  useEffect(() => {
    if (animation === 'typewriter' && title) {
      indexRef.current = 0;
      setAnimatedTitle('');
      
      const animate = () => {
        if (indexRef.current <= title.length) {
          const displayTitle = title.slice(0, indexRef.current) + (indexRef.current < title.length ? '|' : '');
          setAnimatedTitle(displayTitle);
          document.title = displayTitle;
          indexRef.current++;
          frameRef.current = window.setTimeout(animate, 150);
        } else {
          // Restart after delay
          frameRef.current = window.setTimeout(() => {
            indexRef.current = 0;
            animate();
          }, 3000);
        }
      };
      animate();
      
      return () => {
        if (frameRef.current) clearTimeout(frameRef.current);
      };
    } else if (animation === 'shuffle' && title) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let iterations = 0;
      
      const animate = () => {
        const shuffled = title
          .split('')
          .map((char, idx) => {
            if (idx < iterations) return title[idx];
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        setAnimatedTitle(shuffled);
        document.title = shuffled;
        iterations += 0.5;
        
        if (iterations < title.length) {
          frameRef.current = window.setTimeout(animate, 50);
        } else {
          // Restart after delay
          frameRef.current = window.setTimeout(() => {
            iterations = 0;
            animate();
          }, 5000);
        }
      };
      animate();
      
      return () => {
        if (frameRef.current) clearTimeout(frameRef.current);
      };
    } else if (animation === 'decrypted' && title) {
      let revealed = 0;
      
      const animate = () => {
        const decrypted = title
          .split('')
          .map((char, i) => (i <= revealed ? char : char === ' ' ? ' ' : '█'))
          .join('');
        setAnimatedTitle(decrypted);
        document.title = decrypted;
        revealed++;
        
        if (revealed < title.length) {
          frameRef.current = window.setTimeout(animate, 80);
        } else {
          // Restart after delay
          frameRef.current = window.setTimeout(() => {
            revealed = 0;
            animate();
          }, 5000);
        }
      };
      animate();
      
      return () => {
        if (frameRef.current) clearTimeout(frameRef.current);
      };
    } else {
      setAnimatedTitle(title);
      document.title = title;
    }
    
    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [title, animation]);

  return animatedTitle;
}

// Secure profile fetching via API proxy
function useSecureProfile(username: string) {
  return useQuery({
    queryKey: ['secure-profile', username],
    queryFn: async () => {
      // First try as alias
      const aliasProfile = await getPublicProfileByAlias(username);
      if (aliasProfile) {
        return { profile: aliasProfile, isAlias: true };
      }
      
      // Then try as username
      const profile = await getPublicProfile(username);
      return { profile, isAlias: false };
    },
    enabled: !!username,
  });
}

function useSecureLinks(username: string, enabled: boolean) {
  return useQuery({
    queryKey: ['secure-links', username],
    queryFn: () => getProfileLinks(username),
    enabled,
  });
}

function useSecureBadges(username: string, enabled: boolean) {
  return useQuery({
    queryKey: ['secure-badges', username],
    queryFn: () => getProfileBadges(username),
    enabled,
  });
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Use secure API proxy for all profile data
  const { data: profileData, isLoading: profileLoading, error } = useSecureProfile(username || '');
  const profile = profileData?.profile;
  
  // Redirect if accessing via alias
  useEffect(() => {
    if (profileData?.isAlias && profile?.username !== username?.toLowerCase()) {
      navigate(`/${profile?.username}`, { replace: true });
    }
  }, [profileData, profile, username, navigate]);
  
  const { data: socialLinks = [] } = useSecureLinks(profile?.username || '', !!profile);
  const { data: badges = [] } = useSecureBadges(profile?.username || '', !!profile);
  const recordView = useRecordProfileView();
  
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [transparency, setTransparency] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [enableVideoAudio, setEnableVideoAudio] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banCheckDone, setBanCheckDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get accent color from profile
  const accentColor = profile?.accent_color || '#8B5CF6';
  
  // Custom title and animation for browser tab
  const ogTitle = profile?.og_title || (profile ? `@${profile.username} | uservault.cc` : 'UserVault');
  const ogAnimation = profile?.og_title_animation || 'none';
  const ogIconUrl = profile?.og_icon_url;
  
  // Apply animated document title
  useAnimatedDocumentTitle(ogTitle, ogAnimation, ogIconUrl);

  // Check if user is banned - use edge function for security
  useEffect(() => {
    const checkBanStatus = async () => {
      if (profile?.username) {
        try {
          const { data } = await supabase.functions.invoke('check-ban-status', {
            body: { username: profile.username }
          });
          setIsBanned(data?.isBanned ?? false);
        } catch (err) {
          console.error('Error checking ban status');
        }
      }
      setBanCheckDone(true);
    };
    
    if (profile) {
      checkBanStatus();
    }
  }, [profile?.username]);

  // Record profile view - will use internal ID lookup via edge function
  useEffect(() => {
    if (profile?.username && !isBanned) {
      // Use edge function to record view without exposing profile ID
      supabase.functions.invoke('record-view', {
        body: { username: profile.username }
      }).catch(() => {});
    }
  }, [profile?.username, isBanned]);

  // Handle start screen click
  const handleStart = () => {
    setShowStartScreen(false);
    setHasInteracted(true);
    
    // Start audio if available
    if (audioRef.current && profile?.music_url) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(console.error);
    }
  };

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const isLoading = profileLoading || !banCheckDone;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-muted-foreground mb-6">User not found</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Show suspended screen if user is banned
  if (isBanned) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-destructive">Profile Suspended</h1>
          <p className="text-muted-foreground mb-6">
            This profile is temporarily unavailable due to a violation of our terms of service.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Check effects_config for cursor settings
  const effectsConfig = profile.effects_config as Record<string, any> | null;
  const showCursorTrail = effectsConfig?.cursorTrail ?? effectsConfig?.sparkles ?? false;
  const customCursorUrl = profile.custom_cursor_url as string | null;

  // Determine if profile has audio (music OR video background which typically has sound)
  const hasAudio = Boolean(profile.music_url || profile.background_video_url);
  
  // Start screen is required if audio is present (browser autoplay policy)
  // Otherwise, respect the user's start_screen_enabled setting
  const shouldShowStartScreen = hasAudio ? true : (profile.start_screen_enabled !== false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Start Screen - Required for audio, optional otherwise */}
      {showStartScreen && shouldShowStartScreen && (
        <StartScreen 
          onStart={handleStart} 
          message={profile.start_screen_text || "Click anywhere to enter"}
          font={profile.start_screen_font || "Inter"}
          textColor={profile.start_screen_color || accentColor}
          bgColor={profile.start_screen_bg_color || "#000000"}
          textAnimation={profile.start_screen_animation || "none"}
          asciiSize={profile.ascii_size ?? 8}
          asciiWaves={profile.ascii_waves ?? true}
        />
      )}
      
      {/* Auto-start if start screen is disabled AND no audio */}
      {!shouldShowStartScreen && showStartScreen && (() => {
        setTimeout(() => handleStart(), 100);
        return null;
      })()}

      {/* Hidden audio element */}
      {profile.music_url && (
        <audio ref={audioRef} src={profile.music_url} loop />
      )}

      {/* Custom cursor with trail or custom image - disabled on mobile */}
      {!isMobile && (showCursorTrail || customCursorUrl) && hasInteracted && (
        <CustomCursor 
          color={accentColor} 
          showTrail={!!showCursorTrail} 
          cursorUrl={customCursorUrl || undefined}
        />
      )}

      <BackgroundEffects
        backgroundUrl={profile.background_url}
        backgroundVideoUrl={profile.background_video_url}
        backgroundColor={profile.background_color}
        accentColor={accentColor}
        enableAudio={enableVideoAudio && hasInteracted}
        audioVolume={volume}
        effectType={(profile.background_effect || 'particles') as any}
      />

      <div 
        className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12"
        style={{ opacity: transparency }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: showStartScreen ? 0 : 1, y: showStartScreen ? 30 : 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md mx-auto space-y-6"
        >
          <ProfileCard 
            profile={{...profile, accent_color: accentColor} as any} 
            badges={badges.map((b: PublicBadge) => ({
              id: b.name, // Use name as ID since we don't expose real IDs
              name: b.name,
              color: b.color,
              icon_url: b.icon_url,
            }))}
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
          />

          {/* Discord Presence Widget - Only show when border/card is enabled */}
          {profile.discord_user_id && profile.card_border_enabled !== false && (
            <div className="flex justify-center">
              <DiscordPresence
                discordUserId={profile.discord_user_id}
                accentColor={accentColor}
                cardStyle={(profile.discord_card_style || 'glass') as any}
                cardOpacity={profile.discord_card_opacity ?? 100}
                showBadge={profile.discord_show_badge ?? true}
                badgeColor={profile.discord_badge_color || '#ec4899'}
              />
            </div>
          )}

          {/* Social Links - respect visibility setting */}
          {(profile.show_links ?? true) && socialLinks.length > 0 && (
            <SocialLinks 
              links={socialLinks.map((l: PublicLink) => ({
                id: l.url, // Use URL as ID since we don't expose real IDs
                profile_id: '',
                platform: l.platform,
                url: l.url,
                title: l.title,
                icon: l.icon,
                description: l.description,
                style: l.style,
                display_order: l.display_order,
                is_visible: l.is_visible,
                created_at: '',
              }))} 
              accentColor={accentColor}
              glowingIcons={profile.glow_socials ?? false}
              iconOnly={profile.icon_only_links ?? false}
              iconOpacity={profile.icon_links_opacity ?? 100}
            />
          )}
        </motion.div>

      </div>

      {/* Controls Bar - Only show if profile has music and volume control is enabled */}
      {!showStartScreen && profile.music_url && (profile.show_volume_control ?? true) && (
        <SimpleVolumeBar
          volume={volume}
          onVolumeChange={setVolume}
        />
      )}
    </div>
  );
}
