import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, Briefcase, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrbitingAvatar } from '@/components/profile/OrbitingAvatar';
import { AnimatedUsername } from '@/components/profile/AnimatedUsername';
import { AnimatedDisplayName, type TextAnimationType } from '@/components/profile/TextAnimations';
import { SparkleEffect } from '@/components/profile/SparkleEffect';

interface TemplatePreviewProps {
  templateData: Record<string, unknown> | null;
  mini?: boolean;
}

export function TemplatePreview({ templateData, mini = false }: TemplatePreviewProps) {
  // Extract style properties from template data - this is a STATIC snapshot
  const styles = useMemo(() => {
    if (!templateData) return {};
    
    return {
      backgroundColor: templateData.background_color as string || '#0a0a0a',
      backgroundImage: templateData.background_url ? `url(${templateData.background_url})` : undefined,
      backgroundVideoUrl: templateData.background_video_url as string | undefined,
      cardColor: templateData.card_color as string || 'rgba(0,0,0,0.6)',
      textColor: templateData.text_color as string || '#ffffff',
      accentColor: templateData.accent_color as string || '#8B5CF6',
      avatarShape: templateData.avatar_shape as string || 'circle',
      avatarUrl: templateData.avatar_url as string | undefined,
      displayName: templateData.display_name as string || 'Display Name',
      username: templateData.username as string || 'username',
      cardStyle: templateData.card_style as string || 'glass',
      profileOpacity: (templateData.profile_opacity as number) ?? 100,
      profileBlur: (templateData.profile_blur as number) ?? 0,
      cardBorderEnabled: templateData.card_border_enabled as boolean ?? true,
      cardBorderColor: templateData.card_border_color as string || '#ffffff',
      cardBorderWidth: (templateData.card_border_width as number) ?? 1,
      glowUsername: templateData.glow_username as boolean || false,
      glowBadges: templateData.glow_badges as boolean || false,
      transparentBadges: templateData.transparent_badges as boolean || false,
      nameFont: templateData.name_font as string || 'Inter',
      textFont: templateData.text_font as string || 'Inter',
      enableGradient: templateData.enable_profile_gradient as boolean || false,
      iconColor: templateData.icon_color as string | undefined,
      monochrome: templateData.monochrome_icons as boolean || false,
      bio: templateData.bio as string | undefined,
      location: templateData.location as string | undefined,
      occupation: templateData.occupation as string | undefined,
      displayNameAnimation: templateData.display_name_animation as string | undefined,
      asciiSize: (templateData.ascii_size as number) ?? 8,
      asciiWaves: (templateData.ascii_waves as boolean) ?? true,
      effectsConfig: templateData.effects_config as Record<string, boolean> | undefined,
    };
  }, [templateData]);

  const accentColor = styles.accentColor || '#8b5cf6';

  // Mini thumbnail version for card grid
  if (mini) {
    return (
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: styles.backgroundColor || '#0a0a0a',
          backgroundImage: styles.backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {styles.backgroundVideoUrl && (
          <video
            src={styles.backgroundVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="relative w-[90%]">
            {styles.cardBorderEnabled && (
              <div
                className="absolute -inset-0.5 rounded-xl opacity-40 blur-md"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
                }}
              />
            )}
            <div 
              className="relative p-3 rounded-xl backdrop-blur-xl overflow-hidden"
              style={{
                backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
                border: styles.cardBorderEnabled 
                  ? `1px solid ${styles.cardBorderColor || accentColor}30` 
                  : undefined,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                {/* Mini avatar with orbit effect */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-[-2px] pointer-events-none"
                    style={{
                      borderRadius: styles.avatarShape === 'circle' ? '50%' : '8px',
                      background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                  {styles.avatarUrl ? (
                    <img 
                      src={styles.avatarUrl} 
                      alt=""
                      className={cn(
                        "w-8 h-8 object-cover relative z-10",
                        styles.avatarShape === 'circle' && 'rounded-full',
                        styles.avatarShape === 'square' && 'rounded-none',
                        styles.avatarShape === 'soft' && 'rounded-lg',
                        styles.avatarShape === 'rounded' && 'rounded-2xl'
                      )}
                    />
                  ) : (
                    <div 
                      className={cn(
                        "w-8 h-8 flex items-center justify-center relative z-10 bg-muted",
                        styles.avatarShape === 'circle' && 'rounded-full',
                        styles.avatarShape === 'square' && 'rounded-none',
                        styles.avatarShape === 'soft' && 'rounded-lg',
                        styles.avatarShape === 'rounded' && 'rounded-2xl'
                      )}
                      style={{ backgroundColor: `${accentColor}20` }}
                    />
                  )}
                </div>
                {/* Name placeholder */}
                <div 
                  className="text-[8px] font-bold truncate max-w-full"
                  style={{ 
                    color: styles.textColor || '#fff',
                    fontFamily: styles.nameFont || 'Inter'
                  }}
                >
                  {styles.displayName || 'Name'}
                </div>
                {/* Badge dots */}
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: `${accentColor}30`,
                        border: `1px solid ${accentColor}50`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full realistic profile preview - uses EXACT same components as ProfileCard
  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundColor: styles.backgroundColor || '#0a0a0a',
        backgroundImage: styles.backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Background video if present */}
      {styles.backgroundVideoUrl && (
        <video
          src={styles.backgroundVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center p-6">
        {/* Card container - matches ProfileCard max-w-sm */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-sm mx-auto"
        >
          {/* Animated glow effect behind card - exact match */}
          <motion.div
            className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
            }}
            animate={{ opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Main card - exact styling from ProfileCard */}
          <div
            className="relative rounded-2xl p-8 backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
              border: styles.cardBorderEnabled 
                ? `${styles.cardBorderWidth || 1}px solid ${styles.cardBorderColor || accentColor}30` 
                : undefined,
            }}
          >
            {/* Sparkle effects - same as ProfileCard */}
            {styles.effectsConfig?.sparkles && <SparkleEffect />}

            {/* Corner sparkle decorations - exact match */}
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

            {/* Gradient border glow overlay - exact match */}
            <div
              className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${accentColor}30, transparent 50%, ${accentColor}20)`,
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* OrbitingAvatar - REAL component */}
              {styles.avatarUrl && (
                <div className="mb-6">
                  <OrbitingAvatar
                    avatarUrl={styles.avatarUrl}
                    displayName={styles.displayName || 'User'}
                    size={120}
                    accentColor={accentColor}
                    shape={styles.avatarShape as 'circle' | 'rounded' | 'soft' | 'square'}
                  />
                </div>
              )}

              {/* Display Name with animations - REAL components */}
              <div 
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: styles.nameFont || 'Inter' }}
              >
                {styles.displayNameAnimation && styles.displayNameAnimation !== 'none' ? (
                  <AnimatedDisplayName
                    text={styles.displayName || 'Display Name'}
                    animation={styles.displayNameAnimation as TextAnimationType}
                    style={{ fontFamily: styles.nameFont || 'Inter' }}
                    asciiSize={styles.asciiSize}
                    asciiWaves={styles.asciiWaves}
                  />
                ) : (
                  <AnimatedUsername
                    text={styles.displayName || 'Display Name'}
                    fontFamily={styles.nameFont || 'Inter'}
                    accentColor={accentColor}
                    enableRainbow={styles.enableGradient}
                    enableGlow={styles.glowUsername}
                    enableTypewriter={styles.effectsConfig?.typewriter}
                    enableGlitch={styles.effectsConfig?.glow}
                    enableSparkles={styles.effectsConfig?.sparkles}
                  />
                )}
              </div>

              {/* Username - exact styling */}
              <p className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5">
                <AtSign className="w-3.5 h-3.5" />
                {styles.username || 'username'}
              </p>

              {/* Badges placeholder container - exact styling */}
              <div 
                className={cn(
                  "flex flex-wrap justify-center gap-2 mb-4 px-4 py-2 rounded-full",
                  !styles.transparentBadges && "bg-black/20 backdrop-blur-sm"
                )}
              >
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${accentColor}20`,
                      border: `1px solid ${accentColor}40`,
                      boxShadow: styles.glowBadges ? `0 0 10px ${accentColor}40` : undefined
                    }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Bio - exact styling */}
              {styles.bio && (
                <p 
                  className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4"
                  style={{ fontFamily: styles.textFont || 'Inter' }}
                >
                  {styles.bio}
                </p>
              )}

              {/* Location & Occupation - exact styling */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                {styles.occupation && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{styles.occupation}</span>
                  </div>
                )}
                {styles.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{styles.location}</span>
                  </div>
                )}
              </div>

              {/* Views - exact styling */}
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  1,234 views
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
