import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Ban } from 'lucide-react';
import { useProfileByUsername, useSocialLinks, useRecordProfileView, useProfileByAlias } from '@/hooks/useProfile';
import { useProfileBadges } from '@/hooks/useBadges';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { BackgroundEffects } from '@/components/profile/BackgroundEffects';
import { CustomCursor } from '@/components/profile/CustomCursor';
import { DiscordPresence } from '@/components/profile/DiscordPresence';
import { StartScreen } from '@/components/profile/StartScreen';
import { ControlsBar } from '@/components/profile/ControlsBar';
import { SimpleVolumeBar } from '@/components/profile/SimpleVolumeBar';
import { GlitchOverlay } from '@/components/profile/GlitchOverlay';
import { supabase } from '@/integrations/supabase/client';

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

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  // First check if this username is an alias
  const { data: aliasProfile, isLoading: aliasLoading } = useProfileByAlias(username || '');
  
  // If alias found, redirect to the main username
  useEffect(() => {
    if (aliasProfile && aliasProfile.username !== username?.toLowerCase()) {
      navigate(`/${aliasProfile.username}`, { replace: true });
    }
  }, [aliasProfile, username, navigate]);
  
  const { data: profile, isLoading: profileLoading, error } = useProfileByUsername(username || '');
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const { data: badges = [] } = useProfileBadges(profile?.id || '');
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
  const ogTitle = (profile as any)?.og_title || (profile ? `@${profile.username} | uservault.cc` : 'UserVault');
  const ogAnimation = (profile as any)?.og_title_animation || 'none';
  const ogIconUrl = (profile as any)?.og_icon_url;
  
  // Apply animated document title
  useAnimatedDocumentTitle(ogTitle, ogAnimation, ogIconUrl);

  // Check if user is banned
  useEffect(() => {
    const checkBanStatus = async () => {
      if (profile?.user_id) {
        try {
          const { data } = await supabase
            .from('banned_users')
            .select('id')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          
          setIsBanned(!!data);
        } catch (err) {
          console.error('Error checking ban status:', err);
        }
      }
      setBanCheckDone(true);
    };
    
    if (profile) {
      checkBanStatus();
    }
  }, [profile?.user_id]);

  // Record profile view
  useEffect(() => {
    if (profile?.id && !isBanned) {
      recordView.mutate(profile.id);
    }
  }, [profile?.id, isBanned]);

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

  const isLoading = aliasLoading || profileLoading || !banCheckDone;

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

  // Check effects_config for cursor settings - support both old and new field names
  const effectsConfig = profile.effects_config as Record<string, any> | null;
  const showCursorTrail = effectsConfig?.cursorTrail ?? effectsConfig?.sparkles ?? false;
  const customCursorUrl = (profile as any).custom_cursor_url as string | null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Start Screen */}
      {showStartScreen && (profile as any).start_screen_enabled !== false && (
        <StartScreen 
          onStart={handleStart} 
          message={(profile as any).start_screen_text || "Click anywhere to enter"}
          font={(profile as any).start_screen_font || "Inter"}
          textColor={(profile as any).start_screen_color || accentColor}
          bgColor={(profile as any).start_screen_bg_color || "#000000"}
          textAnimation={(profile as any).start_screen_animation || "none"}
          asciiSize={(profile as any).ascii_size ?? 8}
          asciiWaves={(profile as any).ascii_waves ?? true}
        />
      )}
      
      {/* Auto-start if start screen is disabled */}
      {(profile as any).start_screen_enabled === false && showStartScreen && (() => {
        setTimeout(() => handleStart(), 100);
        return null;
      })()}

      {/* Hidden audio element */}
      {profile.music_url && (
        <audio ref={audioRef} src={profile.music_url} loop />
      )}

      {/* Custom cursor with trail or custom image */}
      {(showCursorTrail || customCursorUrl) && hasInteracted && (
        <CustomCursor 
          color={accentColor} 
          showTrail={!!showCursorTrail} 
          cursorUrl={customCursorUrl || undefined}
        />
      )}

      {/* Glitch overlay effect - disabled for simplicity */}

      <BackgroundEffects
        backgroundUrl={profile.background_url}
        backgroundVideoUrl={(profile as any).background_video_url}
        backgroundColor={profile.background_color}
        accentColor={accentColor}
        enableAudio={enableVideoAudio && hasInteracted}
        audioVolume={volume}
        effectType={(profile as any).background_effect || 'particles'}
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
            profile={{...profile, accent_color: accentColor}} 
            badges={badges.map(b => ({
              id: b.id,
              name: b.name,
              color: b.color,
              icon_url: b.icon_url,
            }))}
            showUsername={(profile as any).show_username ?? true}
            showDisplayName={(profile as any).show_display_name ?? true}
            showBadges={(profile as any).show_badges ?? true}
            showViews={(profile as any).show_views ?? true}
            showAvatar={(profile as any).show_avatar ?? true}
            showDescription={(profile as any).show_description ?? true}
            borderEnabled={(profile as any).card_border_enabled ?? true}
            borderColor={(profile as any).card_border_color}
            borderWidth={(profile as any).card_border_width ?? 1}
            transparentBadges={(profile as any).transparent_badges ?? false}
          />

          {/* Discord Presence Widget - Only show when border/card is enabled */}
          {(profile as any).discord_user_id && (profile as any).card_border_enabled !== false && (
            <div className="flex justify-center">
              <DiscordPresence
                discordUserId={(profile as any).discord_user_id}
                accentColor={accentColor}
                cardStyle={(profile as any).discord_card_style || 'glass'}
                cardOpacity={(profile as any).discord_card_opacity ?? 100}
                showBadge={(profile as any).discord_show_badge ?? true}
                badgeColor={(profile as any).discord_badge_color || '#ec4899'}
              />
            </div>
          )}

          {/* Social Links - respect visibility setting */}
          {((profile as any).show_links ?? true) && socialLinks.length > 0 && (
            <SocialLinks 
              links={socialLinks} 
              accentColor={accentColor}
              glowingIcons={(profile as any).glow_socials ?? false}
              iconOnly={(profile as any).icon_only_links ?? false}
              iconOpacity={(profile as any).icon_links_opacity ?? 100}
            />
          )}
        </motion.div>

      </div>

      {/* Controls Bar - Only show if profile has music and volume control is enabled */}
      {!showStartScreen && profile.music_url && ((profile as any).show_volume_control ?? true) && (
        <SimpleVolumeBar
          volume={volume}
          onVolumeChange={setVolume}
        />
      )}
    </div>
  );
}
