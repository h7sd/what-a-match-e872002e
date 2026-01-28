import { ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { BackgroundEffects } from '@/components/profile/BackgroundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Profile, SocialLink as SocialLinkType } from '@/hooks/useProfile';

interface Badge {
  id: string;
  name: string;
  color: string | null;
  icon_url?: string | null;
}

type EffectType = 'none' | 'particles' | 'matrix' | 'snow' | 'stars';

interface LiveProfilePreviewProps {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  avatarShape: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  backgroundUrl?: string;
  backgroundVideoUrl?: string;
  backgroundEffect?: EffectType;
  showUsername: boolean;
  showDisplayName: boolean;
  showBadges: boolean;
  showViews: boolean;
  showAvatar: boolean;
  showDescription: boolean;
  showLinks: boolean;
  viewsCount?: number;
  badges?: Badge[];
  socialLinks?: SocialLinkType[];
  cardBorderEnabled: boolean;
  cardBorderColor?: string;
  cardBorderWidth: number;
  nameFont: string;
  textFont: string;
  iconColor: string;
  monochromeIcons: boolean;
  cardColor?: string;
  effects?: {
    sparkles?: boolean;
    tilt?: boolean;
    glow?: boolean;
    typewriter?: boolean;
  };
  occupation?: string;
  location?: string;
  uidNumber?: number;
}

export function LiveProfilePreview({
  username,
  displayName,
  bio,
  avatarUrl,
  avatarShape,
  backgroundColor,
  accentColor,
  textColor,
  backgroundUrl,
  backgroundVideoUrl,
  backgroundEffect = 'none' as EffectType,
  showUsername,
  showDisplayName,
  showBadges,
  showViews,
  showAvatar,
  showDescription,
  showLinks,
  viewsCount = 0,
  badges = [],
  socialLinks = [],
  cardBorderEnabled,
  cardBorderColor,
  cardBorderWidth,
  nameFont,
  textFont,
  iconColor,
  monochromeIcons,
  cardColor = 'rgba(0,0,0,0.6)',
  effects = { tilt: true },
  occupation,
  location,
  uidNumber = 1,
}: LiveProfilePreviewProps) {
  const isMobile = useIsMobile();

  // Build a mock profile object for ProfileCard
  const mockProfile: Profile = {
    id: 'preview',
    user_id: 'preview',
    username,
    display_name: displayName,
    bio,
    avatar_url: avatarUrl,
    background_url: backgroundUrl || null,
    background_color: backgroundColor,
    accent_color: accentColor,
    card_color: cardColor,
    music_url: null,
    views_count: viewsCount,
    effects_config: effects,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    uid_number: uidNumber,
    avatar_shape: avatarShape,
    name_font: nameFont,
    text_font: textFont,
    text_color: textColor,
    icon_color: iconColor,
    occupation,
    location,
  } as Profile;

  // Mobile: Phone frame design
  if (isMobile) {
    return (
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>
          <Link to={`/${username}`} target="_blank">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ExternalLink className="w-3 h-3" />
              Open
            </Button>
          </Link>
        </div>

        {/* Phone Frame */}
        <div className="flex justify-center">
          <div className="relative rounded-[2rem] p-1.5 bg-black/80 shadow-2xl" style={{ width: '260px' }}>
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-xl z-20" />
            
            {/* Screen */}
            <div 
              className="relative rounded-[1.5rem] overflow-hidden"
              style={{ backgroundColor, height: '460px' }}
            >
              {/* Background */}
              {backgroundVideoUrl ? (
                <video
                  src={backgroundVideoUrl}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  autoPlay muted loop playsInline
                />
              ) : backgroundUrl ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-50"
                  style={{ backgroundImage: `url(${backgroundUrl})` }}
                />
              ) : null}

              {/* Gradient */}
              <div 
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}20 0%, transparent 60%)` }}
              />

              {/* Content - Scaled down */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 overflow-y-auto" style={{ transform: 'scale(0.75)', transformOrigin: 'center center' }}>
                <ProfileCard
                  profile={mockProfile}
                  badges={badges}
                  showUsername={showUsername}
                  showDisplayName={showDisplayName}
                  showBadges={showBadges}
                  showViews={showViews}
                  showAvatar={showAvatar}
                  showDescription={showDescription}
                  borderEnabled={cardBorderEnabled}
                  borderColor={cardBorderColor}
                  borderWidth={cardBorderWidth}
                />

                {showLinks && socialLinks.length > 0 && (
                  <div className="mt-4 w-full">
                    <SocialLinks
                      links={socialLinks.slice(0, 2)}
                      accentColor={accentColor}
                      glowingIcons={effects?.glow}
                    />
                  </div>
                )}
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Full page preview in iframe-style container
  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <Link to={`/${username}`} target="_blank">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ExternalLink className="w-3 h-3" />
            Open Profile
          </Button>
        </Link>
      </div>

      {/* Browser Frame */}
      <div className="rounded-xl overflow-hidden border border-border/50 shadow-2xl">
        {/* Browser Header */}
        <div className="bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-3 border-b border-border/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-muted/50 rounded-md px-4 py-1 text-xs text-muted-foreground">
              /{username}
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div 
          className="relative overflow-hidden"
          style={{ 
            backgroundColor,
            height: '500px',
          }}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <BackgroundEffects
              backgroundUrl={backgroundUrl}
              backgroundVideoUrl={backgroundVideoUrl}
              backgroundColor={backgroundColor}
              accentColor={accentColor}
              enableAudio={false}
              audioVolume={0}
              effectType={backgroundEffect}
            />
          </div>

          {/* Profile Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md mx-auto space-y-6">
              <ProfileCard
                profile={mockProfile}
                badges={badges}
                showUsername={showUsername}
                showDisplayName={showDisplayName}
                showBadges={showBadges}
                showViews={showViews}
                showAvatar={showAvatar}
                showDescription={showDescription}
                borderEnabled={cardBorderEnabled}
                borderColor={cardBorderColor}
                borderWidth={cardBorderWidth}
              />

              {showLinks && socialLinks.length > 0 && (
                <SocialLinks
                  links={socialLinks}
                  accentColor={accentColor}
                  glowingIcons={effects?.glow}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
