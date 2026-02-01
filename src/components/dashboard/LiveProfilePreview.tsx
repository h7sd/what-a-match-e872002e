import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    cursorTrail?: boolean;
  };
  occupation?: string;
  location?: string;
  uidNumber?: number;
  glowSocials?: boolean;
  iconOnlyLinks?: boolean;
  iconLinksOpacity?: number;
  enableRainbow?: boolean;
  glowUsername?: boolean;
  customCursorUrl?: string;
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
  glowSocials = false,
  iconOnlyLinks = false,
  iconLinksOpacity = 100,
  enableRainbow = false,
  glowUsername = false,
  customCursorUrl,
}: LiveProfilePreviewProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const cursorType = useMemo(() => {
    const url = (customCursorUrl || '').toLowerCase();
    if (!url) return 'none' as const;
    if (url.endsWith('.ani')) return 'ani' as const;
    if (url.endsWith('.cur')) return 'cur' as const;
    if (url.endsWith('.gif')) return 'gif' as const;
    if (url.endsWith('.png')) return 'png' as const;
    return 'other' as const;
  }, [customCursorUrl]);

  const useOverlayCursor = !!customCursorUrl && (cursorType === 'gif' || cursorType === 'png');
  const useCssCursor = !!customCursorUrl && !useOverlayCursor;

  useEffect(() => {
    if (!useOverlayCursor) return;
    const el = previewRef.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCursorPos({ x, y }));
    };
    const onEnter = () => setCursorVisible(true);
    const onLeave = () => setCursorVisible(false);

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [useOverlayCursor]);

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
    enable_profile_gradient: enableRainbow,
    glow_username: glowUsername,
  } as Profile;

  // Mobile: Phone frame design
  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to={`/${username}`} target="_blank">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <ExternalLink className="w-3 h-3" />
                Open
              </Button>
            </Link>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-4">
          {/* Phone Frame */}
          <div className="flex justify-center">
            <div className="relative rounded-[2rem] p-1.5 bg-black/80 shadow-2xl" style={{ width: '260px' }}>
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-xl z-20" />
              
              {/* Screen */}
               <div
                 ref={previewRef}
                 className="relative rounded-[1.5rem] overflow-hidden live-preview-cursor"
                 style={{
                   backgroundColor,
                   height: '460px',
                 }}
               >
                 {customCursorUrl && (
                   <style>{`
                     .live-preview-cursor, .live-preview-cursor * {
                       cursor: ${useOverlayCursor ? 'none' : useCssCursor ? `url(${customCursorUrl}) 16 16, auto` : 'auto'} !important;
                     }
                   `}</style>
                 )}
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

                 {/* Overlay cursor preview for PNG/GIF */}
                 {useOverlayCursor && cursorVisible && (
                   <img
                     src={customCursorUrl}
                     alt="custom cursor"
                     className="absolute z-30 pointer-events-none"
                     style={{
                       left: cursorPos.x,
                       top: cursorPos.y,
                       width: 28,
                       height: 28,
                       transform: 'translate(-20%, -20%)',
                       objectFit: 'contain',
                     }}
                   />
                 )}

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
                        glowingIcons={glowSocials}
                        iconOnly={iconOnlyLinks}
                        iconOpacity={iconLinksOpacity}
                      />
                    </div>
                  )}
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Desktop: Full page preview in iframe-style container
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="glass-card p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to={`/${username}`} target="_blank">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ExternalLink className="w-3 h-3" />
              Open Profile
            </Button>
          </Link>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="mt-4">
        {/* Browser Frame */}
        <div className="rounded-xl overflow-hidden border border-border/50 shadow-2xl">
          {/* Browser Header */}
          <div className="bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-3 border-b border-border/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-warning/80" />
              <div className="w-3 h-3 rounded-full bg-success/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-muted/50 rounded-md px-4 py-1 text-xs text-muted-foreground">
                /{username}
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div
            ref={previewRef}
            className="relative overflow-hidden group live-preview-cursor"
            style={{
              backgroundColor,
              height: '500px',
            }}
          >
            {customCursorUrl && (
              <style>{`
                .live-preview-cursor, .live-preview-cursor * {
                  cursor: ${useOverlayCursor ? 'none' : useCssCursor ? `url(${customCursorUrl}) 16 16, auto` : 'auto'} !important;
                }
              `}</style>
            )}
            {/* Background Video */}
            {backgroundVideoUrl && (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.7 }}
              >
                <source src={backgroundVideoUrl} type="video/mp4" />
              </video>
            )}

            {/* Background Image */}
            {!backgroundVideoUrl && backgroundUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: `url(${backgroundUrl})`,
                  opacity: 0.7,
                }}
              />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${accentColor}30, transparent 60%)`,
              }}
            />

            {/* Overlay cursor preview for PNG/GIF */}
            {useOverlayCursor && cursorVisible && (
              <img
                src={customCursorUrl}
                alt="custom cursor"
                className="absolute z-30 pointer-events-none"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: 28,
                  height: 28,
                  transform: 'translate(-20%, -20%)',
                  objectFit: 'contain',
                }}
              />
            )}

            {customCursorUrl && (cursorType === 'ani' || cursorType === 'cur') && (
              <div className="absolute top-2 right-2 z-20 px-2 py-1 rounded bg-muted/70 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {cursorType.toUpperCase()} preview is browser-limited
              </div>
            )}

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
                    glowingIcons={glowSocials}
                    iconOnly={iconOnlyLinks}
                    iconOpacity={iconLinksOpacity}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
