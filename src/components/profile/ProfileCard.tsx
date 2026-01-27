import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Eye, MapPin, Briefcase, AtSign } from 'lucide-react';
import type { Profile } from '@/hooks/useProfile';
import { SparkleEffect } from './SparkleEffect';
import { GlitchText } from './GlitchText';
import { OrbitingAvatar } from './OrbitingAvatar';
import { getBadgeIcon, getBadgeImage } from '@/lib/badges';
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
  showBadges?: boolean;
  showViews?: boolean;
  borderEnabled?: boolean;
  borderColor?: string | null;
  borderWidth?: number;
}

export function ProfileCard({ 
  profile, 
  badges = [], 
  showUsername = true, 
  showBadges = true, 
  showViews = true,
  borderEnabled = true,
  borderColor,
  borderWidth = 1,
}: ProfileCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);


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
      {/* Animated glow effect behind card - only show when border is enabled */}
      {borderEnabled && (
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
      )}

      <div
        className="relative rounded-2xl p-8 backdrop-blur-xl overflow-hidden"
        style={{
          backgroundColor: profile.card_color || 'rgba(0,0,0,0.6)',
          border: borderEnabled ? `${borderWidth}px solid ${borderColor || accentColor}30` : 'none',
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
          <div className="mb-6">
            <OrbitingAvatar
              avatarUrl={profile.avatar_url || undefined}
              displayName={profile.display_name || profile.username}
              size={120}
              accentColor={accentColor}
              shape={avatarShape as 'circle' | 'rounded' | 'soft' | 'square'}
            />
          </div>

          {/* Display Name with glitch effect */}
          <h1 
            className="text-2xl font-bold mb-1"
            style={{ 
              fontFamily: (profile as any).name_font || 'Inter',
              color: 'white',
              textShadow: `0 0 10px ${accentColor}40`,
            }}
          >
            {profile.effects_config?.typewriter ? (
              <GlitchText 
                text={profile.display_name || profile.username} 
                typewriter 
                loop
                glitchIntensity={0.05}
              />
            ) : (
              <GlitchText 
                text={profile.display_name || profile.username}
                glitchIntensity={0.03}
              />
            )}
          </h1>

          {/* Username with UID tooltip */}
          {showUsername && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-muted-foreground text-sm mb-3 cursor-default flex items-center gap-0.5 hover:text-foreground/70 transition-colors">
                    <AtSign className="w-3.5 h-3.5" />
                    {profile.username}
                  </p>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg"
                >
                  UID: {(profile as any).uid_number || '1'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Badges - Icon only with hover tooltip like feds.lol */}
          {showBadges && badges.length > 0 && (
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap max-w-[280px] mx-auto">
                {badges.map((badge) => {
                  const Icon = getBadgeIcon(badge.name);
                  const badgeColor = badge.color || accentColor;
                  const customImage = getBadgeImage(badge.name);

                  return (
                    <Tooltip key={badge.id}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="w-6 h-6 flex items-center justify-center cursor-pointer"
                          whileHover={{ 
                            scale: 1.3,
                            filter: `drop-shadow(0 0 8px ${badgeColor})`,
                          }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                          {badge.icon_url ? (
                            <img
                              src={badge.icon_url}
                              alt={badge.name}
                              className="w-6 h-6 object-contain"
                              loading="lazy"
                            />
                          ) : customImage ? (
                            <img
                              src={customImage}
                              alt={badge.name}
                              className="w-6 h-6 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Icon 
                              className="w-6 h-6 transition-all duration-200" 
                              style={{ 
                                color: badgeColor,
                                filter: `drop-shadow(0 0 4px ${badgeColor}50)`,
                              }} 
                            />
                          )}
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl"
                        style={{
                          boxShadow: `0 4px 20px ${badgeColor}40`,
                        }}
                      >
                        {badge.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}

          {/* Bio */}
          {profile.bio && (
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
