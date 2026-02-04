import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Eye, MapPin, Briefcase, AtSign } from 'lucide-react';
import type { Profile } from '@/hooks/useProfile';
import { SparkleEffect } from './SparkleEffect';
import { AnimatedUsername } from './AnimatedUsername';
import { AnimatedDisplayName, type TextAnimationType } from './TextAnimations';
import { OrbitingAvatar } from './OrbitingAvatar';
import { ProfileBadgesDisplay } from './ProfileBadgesDisplay';
import { useActiveHuntEvent } from '@/hooks/useActiveHuntEvent';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProfileCardProps {
  profile: Profile;
  badges?: Array<{ id: string; name: string; color: string | null; icon_url?: string | null }>;
  showUsername?: boolean;
  showDisplayName?: boolean;
  showBadges?: boolean;
  showViews?: boolean;
  showAvatar?: boolean;
  showDescription?: boolean;
  borderEnabled?: boolean;
  borderColor?: string | null;
  borderWidth?: number;
  transparentBadges?: boolean;
  isOwnProfile?: boolean;
}

export function ProfileCard({ 
  profile, 
  badges = [], 
  showUsername = true, 
  showDisplayName = true,
  showBadges = true, 
  showViews = true,
  showAvatar = true,
  showDescription = true,
  borderEnabled = true,
  borderColor,
  borderWidth = 1,
  transparentBadges = false,
  isOwnProfile = false,
}: ProfileCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: activeHuntEvent } = useActiveHuntEvent();
  // Force badges visible when ANY badge is the active hunt target (owner cannot hide)
  const hasHuntBadge = activeHuntEvent?.target_badge_id
    ? badges.some((b) => b.id === activeHuntEvent.target_badge_id)
    : false;
  const effectiveShowBadges = showBadges || hasHuntBadge;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !profile.effects_config?.tilt) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateXValue = (mouseY / (rect.height / 2)) * -10;
    const rotateYValue = (mouseX / (rect.width / 2)) * 10;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const accentColor = profile.accent_color || '#8b5cf6';
  const avatarShape = (profile as any).avatar_shape || 'circle';

  const avatarClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    soft: 'rounded-lg',
    rounded: 'rounded-2xl',
  };

  // If border is disabled, card should be transparent/invisible
  if (!borderEnabled) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: 'transform 0.1s ease-out',
        }}
        className="relative w-full max-w-sm mx-auto"
      >
        {/* Transparent mode - no card background, just content */}
        <div className="relative p-8">
          {/* Sparkle effects */}
          {profile.effects_config?.sparkles && <SparkleEffect />}

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Avatar with orbiting effect */}
            {showAvatar && (
              <div className="mb-6">
                <OrbitingAvatar
                  avatarUrl={profile.avatar_url || undefined}
                  displayName={profile.display_name || profile.username}
                  size={120}
                  accentColor={accentColor}
                  shape={avatarShape as 'circle' | 'rounded' | 'soft' | 'square'}
                />
              </div>
            )}

            {/* Display Name with effects and UID tooltip */}
            {showDisplayName && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      aria-label={`User ID: ${(profile as any).uid_number || '1'}`}
                      className="text-2xl font-bold mb-1 cursor-pointer hover:opacity-80 transition-opacity touch-manipulation min-h-[44px] flex items-center justify-center bg-transparent border-none"
                      style={{ 
                        fontFamily: (profile as any).name_font || 'Inter',
                      }}
                    >
                      {(profile as any).display_name_animation && (profile as any).display_name_animation !== 'none' ? (
                        <AnimatedDisplayName
                          text={profile.display_name || profile.username}
                          animation={(profile as any).display_name_animation as TextAnimationType}
                          style={{ fontFamily: (profile as any).name_font || 'Inter' }}
                          asciiSize={(profile as any).ascii_size ?? 8}
                          asciiWaves={(profile as any).ascii_waves ?? true}
                        />
                      ) : (
                        <AnimatedUsername
                          text={profile.display_name || profile.username}
                          fontFamily={(profile as any).name_font || 'Inter'}
                          accentColor={accentColor}
                          enableRainbow={(profile as any).enable_profile_gradient}
                          enableGlow={(profile as any).glow_username}
                          enableTypewriter={profile.effects_config?.typewriter}
                          enableGlitch={profile.effects_config?.glow}
                          enableSparkles={profile.effects_config?.sparkles}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg"
                  >
                    UID: #{(profile as any).uid_number || '1'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Username */}
            {showUsername && (
              <p className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5">
                <AtSign className="w-3.5 h-3.5" />
                {profile.username}
              </p>
            )}

            {/* Badges - with transparent rounded container */}
            {effectiveShowBadges && badges.length > 0 && (
              <ProfileBadgesDisplay
                badges={badges}
                profileUsername={profile.username}
                isOwnProfile={isOwnProfile}
                accentColor={accentColor}
                transparentBadges={transparentBadges}
                forceShow={hasHuntBadge}
              />
            )}

            {/* Bio */}
            {showDescription && profile.bio && (
              <p 
                className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4"
                style={{ fontFamily: (profile as any).text_font || 'Inter' }}
              >
                {profile.bio}
              </p>
            )}

            {/* Location & Occupation */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
              {(profile as any).occupation && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  <span>{(profile as any).occupation}</span>
                </div>
              )}
              {(profile as any).location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{(profile as any).location}</span>
                </div>
              )}
            </div>

            {/* Views */}
            {showViews && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <motion.span
                  key={profile.views_count}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {profile.views_count.toLocaleString()} views
                </motion.span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
      className="relative w-full max-w-sm mx-auto"
    >
      {/* Animated glow effect behind card */}
      <motion.div
        className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div
        className="relative rounded-2xl p-8 backdrop-blur-xl overflow-hidden"
        style={{
          backgroundColor: profile.card_color || 'rgba(0,0,0,0.6)',
          border: `${borderWidth}px solid ${borderColor || accentColor}30`,
        }}
      >
        {/* Sparkle effects */}
        {profile.effects_config?.sparkles && <SparkleEffect />}

        {/* Corner sparkle decorations */}
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
          className="absolute inset-0 rounded-2xl opacity-30"
          style={{
            background: `linear-gradient(135deg, ${accentColor}30, transparent 50%, ${accentColor}20)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Avatar with orbiting effect */}
          {showAvatar && (
            <div className="mb-6">
              <OrbitingAvatar
                avatarUrl={profile.avatar_url || undefined}
                displayName={profile.display_name || profile.username}
                size={120}
                accentColor={accentColor}
                shape={avatarShape as 'circle' | 'rounded' | 'soft' | 'square'}
              />
            </div>
          )}

          {/* Display Name with effects and UID tooltip */}
          {showDisplayName && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    aria-label={`User ID: ${(profile as any).uid_number || '1'}`}
                    className="text-2xl font-bold mb-1 cursor-pointer hover:opacity-80 transition-opacity touch-manipulation min-h-[44px] flex items-center justify-center bg-transparent border-none"
                    style={{ 
                      fontFamily: (profile as any).name_font || 'Inter',
                    }}
                  >
                    {(profile as any).display_name_animation && (profile as any).display_name_animation !== 'none' ? (
                      <AnimatedDisplayName
                        text={profile.display_name || profile.username}
                        animation={(profile as any).display_name_animation as TextAnimationType}
                        style={{ fontFamily: (profile as any).name_font || 'Inter' }}
                        asciiSize={(profile as any).ascii_size ?? 8}
                        asciiWaves={(profile as any).ascii_waves ?? true}
                      />
                    ) : (
                      <AnimatedUsername
                        text={profile.display_name || profile.username}
                        fontFamily={(profile as any).name_font || 'Inter'}
                        accentColor={accentColor}
                        enableRainbow={(profile as any).enable_profile_gradient}
                        enableGlow={(profile as any).glow_username}
                        enableTypewriter={profile.effects_config?.typewriter}
                        enableGlitch={profile.effects_config?.glow}
                        enableSparkles={profile.effects_config?.sparkles}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg"
                >
                  UID: #{(profile as any).uid_number || '1'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Username */}
          {showUsername && (
            <p className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5">
              <AtSign className="w-3.5 h-3.5" />
              {profile.username}
            </p>
          )}

          {/* Badges - with transparent rounded container */}
          {effectiveShowBadges && badges.length > 0 && (
            <ProfileBadgesDisplay
              badges={badges}
              profileUsername={profile.username}
              isOwnProfile={isOwnProfile}
              accentColor={accentColor}
              transparentBadges={transparentBadges}
              forceShow={hasHuntBadge}
            />
          )}

          {/* Bio */}
          {showDescription && profile.bio && (
            <p 
              className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4"
              style={{ fontFamily: (profile as any).text_font || 'Inter' }}
            >
              {profile.bio}
            </p>
          )}

          {/* Location & Occupation */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
            {(profile as any).occupation && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                <span>{(profile as any).occupation}</span>
              </div>
            )}
            {(profile as any).location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{(profile as any).location}</span>
              </div>
            )}
          </div>

          {/* Views */}
          {showViews && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <motion.span
                key={profile.views_count}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {profile.views_count.toLocaleString()} views
              </motion.span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
