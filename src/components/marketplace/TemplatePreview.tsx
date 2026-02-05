import { useMemo, memo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, Briefcase, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TemplatePreviewProps {
  templateData: Record<string, unknown> | null;
  mini?: boolean;
}

// Fetch current user's display name to show in preview
function useCurrentUserName() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-user-preview-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });
}

// Memoized component - exact ProfileCard replica with user's name
export const TemplatePreview = memo(function TemplatePreview({ templateData, mini = false }: TemplatePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data: currentUser } = useCurrentUserName();
  
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
      cardBorderEnabled: templateData.card_border_enabled as boolean ?? true,
      cardBorderColor: templateData.card_border_color as string || '#ffffff',
      cardBorderWidth: (templateData.card_border_width as number) ?? 1,
      glowUsername: templateData.glow_username as boolean || false,
      glowBadges: templateData.glow_badges as boolean || false,
      transparentBadges: templateData.transparent_badges as boolean || false,
      nameFont: templateData.name_font as string || 'Inter',
      textFont: templateData.text_font as string || 'Inter',
      enableGradient: templateData.enable_profile_gradient as boolean || false,
      bio: templateData.bio as string | undefined,
      location: templateData.location as string | undefined,
      occupation: templateData.occupation as string | undefined,
      displayNameAnimation: templateData.display_name_animation as string | undefined,
      effectsConfig: templateData.effects_config as Record<string, boolean> | undefined,
    };
  }, [templateData]);

  // Use current user's name if logged in, otherwise show template name
  const previewDisplayName = currentUser?.display_name || currentUser?.username || styles.displayName || 'Your Name';
  const previewUsername = currentUser?.username || styles.username || 'username';

  const accentColor = styles.accentColor || '#8b5cf6';

  const avatarShapeClass = useMemo(() => {
    const classes: Record<string, string> = {
      circle: 'rounded-full',
      square: 'rounded-none',
      soft: 'rounded-lg',
      rounded: 'rounded-2xl',
    };
    return classes[styles.avatarShape || 'circle'] || 'rounded-full';
  }, [styles.avatarShape]);

  // Autoplay video when component mounts
  useEffect(() => {
    if (videoRef.current && styles.backgroundVideoUrl) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, that's okay
      });
    }
  }, [styles.backgroundVideoUrl]);

  // Mini thumbnail version - simplified for grid display
  if (mini) {
    return (
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: styles.backgroundColor || '#0a0a0a',
        }}
      >
        {/* Background image */}
        {styles.backgroundImage && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: styles.backgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        
        {/* Background video - also in mini preview */}
        {styles.backgroundVideoUrl && (
          <video
            src={styles.backgroundVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="relative w-[85%]">
            {styles.cardBorderEnabled && (
              <div
                className="absolute -inset-0.5 rounded-xl opacity-40 blur-md"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
                }}
              />
            )}
            <div 
              className="relative p-3 rounded-xl backdrop-blur-sm overflow-hidden"
              style={{
                backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
                border: styles.cardBorderEnabled 
                  ? `1px solid ${styles.cardBorderColor || accentColor}30` 
                  : undefined,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                {/* Avatar with glow ring */}
                {styles.avatarUrl ? (
                  <div className="relative">
                    {/* Glow ring */}
                    <div
                      className={cn("absolute inset-[-2px] pointer-events-none animate-spin", avatarShapeClass)}
                      style={{
                        background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
                        animationDuration: '8s',
                      }}
                    />
                    <img 
                      src={styles.avatarUrl} 
                      alt=""
                      loading="lazy"
                      className={cn("w-8 h-8 object-cover relative z-10", avatarShapeClass)}
                    />
                  </div>
                ) : (
                  <div 
                    className={cn("w-8 h-8 bg-muted", avatarShapeClass)}
                    style={{ backgroundColor: `${accentColor}20` }}
                  />
                )}
                {/* Name - shows logged-in user's name */}
                <div 
                  className="text-[8px] font-bold truncate max-w-full"
                  style={{ 
                    color: styles.textColor || '#fff',
                    fontFamily: styles.nameFont || 'Inter',
                    textShadow: styles.glowUsername ? `0 0 8px ${accentColor}` : undefined,
                  }}
                >
                  {currentUser?.display_name || currentUser?.username || styles.displayName || 'Your Name'}
                </div>
                {/* Badge dots */}
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: `${accentColor}40`,
                        border: `1px solid ${accentColor}60`,
                        boxShadow: styles.glowBadges ? `0 0 4px ${accentColor}40` : undefined,
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

  // Full preview - EXACT ProfileCard replica with template's styling but user's name
  return (
    <div 
      className="w-full h-full relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundColor: styles.backgroundColor || '#0a0a0a',
      }}
    >
      {/* Background image */}
      {styles.backgroundImage && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: styles.backgroundImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      
      {/* Background video - EXACT same as real profile */}
      {styles.backgroundVideoUrl && (
        <>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          >
            <source src={styles.backgroundVideoUrl} type="video/mp4" />
            <source src={styles.backgroundVideoUrl} type="video/quicktime" />
          </video>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        </>
      )}

      {/* Centered card container */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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

          {/* Main card */}
          <div
            className="relative rounded-2xl p-6 sm:p-8 backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
              border: styles.cardBorderEnabled 
                ? `${styles.cardBorderWidth || 1}px solid ${styles.cardBorderColor || accentColor}30` 
                : undefined,
            }}
          >
            {/* Corner sparkle decorations - animated */}
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

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Avatar with OrbitingAvatar effect - EXACT replica */}
              {styles.avatarUrl && (
                <div className="mb-4 sm:mb-6 relative" style={{ width: 120, height: 120 }}>
                  {/* Orbiting particle */}
                  <motion.div
                    className="absolute inset-[-4px] pointer-events-none"
                    style={{
                      borderRadius: styles.avatarShape === 'circle' ? '50%' : '24px',
                    }}
                  >
                    <motion.div
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${accentColor}, transparent)`,
                        boxShadow: `0 0 10px ${accentColor}`,
                        filter: 'blur(1px)',
                      }}
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      initial={{ x: 54, y: -6 }}
                    />
                  </motion.div>

                  {/* Glow ring - rotating */}
                  <motion.div
                    className="absolute inset-[-4px] pointer-events-none"
                    style={{
                      borderRadius: styles.avatarShape === 'circle' ? '50%' : '24px',
                      background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />

                  {/* Avatar image */}
                  <motion.div
                    className={cn("relative w-full h-full overflow-hidden", avatarShapeClass)}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <img
                      src={styles.avatarUrl}
                      alt={previewDisplayName}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>

                  {/* Inner glow */}
                  <div
                    className={cn("absolute inset-0 pointer-events-none", avatarShapeClass)}
                    style={{
                      boxShadow: `inset 0 0 30px ${accentColor}20`,
                    }}
                  />
                </div>
              )}

              {/* Display Name - SHOWS LOGGED-IN USER'S NAME */}
              <h2 
                className="text-xl sm:text-2xl font-bold mb-1"
                style={{ 
                  color: styles.textColor || '#fff',
                  fontFamily: styles.nameFont || 'Inter',
                  textShadow: styles.glowUsername ? `0 0 20px ${accentColor}` : undefined,
                  background: styles.enableGradient 
                    ? `linear-gradient(90deg, ${accentColor}, #fff, ${accentColor})` 
                    : undefined,
                  WebkitBackgroundClip: styles.enableGradient ? 'text' : undefined,
                  WebkitTextFillColor: styles.enableGradient ? 'transparent' : undefined,
                }}
              >
                {previewDisplayName}
              </h2>

              {/* Username - SHOWS LOGGED-IN USER'S USERNAME */}
              <p className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5">
                <AtSign className="w-3.5 h-3.5" />
                {previewUsername}
              </p>

              {/* Badges placeholder */}
              <div 
                className={cn(
                  "flex flex-wrap justify-center gap-2 mb-4 px-3 py-1.5 rounded-full",
                  !styles.transparentBadges && "bg-black/20 backdrop-blur-sm"
                )}
              >
                {[1, 2, 3].map(i => (
                  <div 
                    key={i}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ 
                      backgroundColor: `${accentColor}20`,
                      border: `1px solid ${accentColor}40`,
                      boxShadow: styles.glowBadges ? `0 0 10px ${accentColor}40` : undefined
                    }}
                  >
                    <div 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                ))}
              </div>

              {/* Bio from template */}
              {styles.bio && (
                <p 
                  className="text-muted-foreground text-xs sm:text-sm max-w-xs leading-relaxed mb-4"
                  style={{ 
                    fontFamily: styles.textFont || 'Inter',
                    color: styles.textColor ? `${styles.textColor}99` : undefined,
                  }}
                >
                  {styles.bio}
                </p>
              )}

              {/* Location & Occupation from template */}
              {(styles.occupation || styles.location) && (
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground mb-4">
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
              )}

              {/* Views */}
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <span>1,234 views</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
});
