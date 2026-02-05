import { useMemo, memo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, Briefcase, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedUsername } from '@/components/profile/AnimatedUsername';

interface TemplatePreviewProps {
  templateData: Record<string, unknown> | null;
  mini?: boolean;
}

interface Badge {
  id: string;
  name: string;
  icon_url: string | null;
  color: string | null;
  description: string | null;
  custom_color?: string | null;
}

// Fetch current user's profile data and badges
function useCurrentUserData() {
  const { user } = useAuth();
  
  const profileQuery = useQuery({
    queryKey: ['current-user-preview-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, occupation, location')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const badgesQuery = useQuery({
    queryKey: ['current-user-preview-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_badges')
        .select(`
          id,
          display_order,
          is_enabled,
          custom_color,
          badge:global_badges (
            id,
            name,
            icon_url,
            color,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });
      
      return (data || [])
        .filter(ub => ub.badge)
        .map(ub => ({
          ...ub.badge,
          custom_color: ub.custom_color,
        })) as Badge[];
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  return {
    profile: profileQuery.data,
    badges: badgesQuery.data || [],
    isLoading: profileQuery.isLoading || badgesQuery.isLoading,
  };
}

// Memoized component - exact ProfileCard replica with user's name and badges
export const TemplatePreview = memo(function TemplatePreview({ templateData, mini = false }: TemplatePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { profile: currentUser, badges: userBadges } = useCurrentUserData();
  
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
  // Use current user's occupation/location if available
  const previewOccupation = currentUser?.occupation || styles.occupation;
  const previewLocation = currentUser?.location || styles.location;

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

      {/* Centered content - absolutely positioned for true centering */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center px-4 w-full">
          {/* Display Name with animation effect from template */}
          <div className="mb-1">
            <AnimatedUsername
              text={previewDisplayName}
              effect={styles.displayNameAnimation as any || 'none'}
              fontFamily={styles.nameFont || 'Inter'}
              className="text-2xl sm:text-3xl font-bold"
              enableGlitch={styles.glowUsername}
            />
          </div>

          {/* Username */}
          <p className="text-muted-foreground text-sm mb-5 flex items-center justify-center gap-0.5">
            <AtSign className="w-3.5 h-3.5" />
            {previewUsername}
          </p>

          {/* User's REAL badges - larger, no pill background like image 2 */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-5">
            <TooltipProvider delayDuration={0}>
              {userBadges.length > 0 ? (
                userBadges.slice(0, 6).map((badge) => (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer overflow-hidden"
                        style={{ 
                          boxShadow: styles.glowBadges ? `0 0 12px ${badge.custom_color || badge.color || accentColor}50` : undefined
                        }}
                      >
                        {badge.icon_url ? (
                          <img 
                            src={badge.icon_url} 
                            alt={badge.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded-full"
                            style={{ backgroundColor: badge.custom_color || badge.color || accentColor }}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{badge.name}</p>
                      {badge.description && <p className="text-muted-foreground">{badge.description}</p>}
                    </TooltipContent>
                  </Tooltip>
                ))
              ) : (
                // Fallback placeholder badges if user has none
                [1, 2, 3].map(i => (
                  <div 
                    key={i}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                    style={{ 
                      backgroundColor: `${accentColor}60`,
                    }}
                  />
                ))
              )}
            </TooltipProvider>
          </div>

          {/* Occupation & Location */}
          {(previewOccupation || previewLocation) && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
              {previewOccupation && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>{previewOccupation}</span>
                </div>
              )}
              {previewLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{previewLocation}</span>
                </div>
              )}
            </div>
          )}

          {/* Views */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>1,234 views</span>
          </div>
        </div>
      </div>

      {/* Corner sparkles */}
      <motion.div
        className="absolute top-8 right-8 text-xl pointer-events-none z-20"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ color: accentColor }}
      >
        ✦
      </motion.div>
      <motion.div
        className="absolute bottom-8 right-8 text-xl pointer-events-none z-20"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        style={{ color: accentColor }}
      >
        ✦
      </motion.div>
      <motion.div
        className="absolute top-1/3 left-6 text-sm pointer-events-none z-20"
        animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        style={{ color: accentColor }}
      >
        ✦
      </motion.div>
    </div>
  );
});
