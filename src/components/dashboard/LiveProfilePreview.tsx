import { motion } from 'framer-motion';
import { Eye, ExternalLink, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Badge {
  id: string;
  name: string;
  color?: string | null;
  icon_url?: string | null;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  title?: string | null;
  icon?: string | null;
}

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
  showUsername: boolean;
  showDisplayName: boolean;
  showBadges: boolean;
  showViews: boolean;
  showAvatar: boolean;
  showDescription: boolean;
  showLinks: boolean;
  viewsCount?: number;
  badges?: Badge[];
  socialLinks?: SocialLink[];
  cardBorderEnabled: boolean;
  cardBorderColor?: string;
  cardBorderWidth: number;
  nameFont: string;
  textFont: string;
  iconColor: string;
  monochromeIcons: boolean;
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
}: LiveProfilePreviewProps) {
  const getAvatarRadius = () => {
    switch (avatarShape) {
      case 'square': return '0';
      case 'soft': return '8px';
      case 'rounded': return '16px';
      case 'circle':
      default: return '50%';
    }
  };

  const borderStyle = cardBorderEnabled ? {
    border: `${cardBorderWidth}px solid ${cardBorderColor || accentColor}`,
  } : {};

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
            Open Profile
          </Button>
        </Link>
      </div>

      {/* Phone Frame Container */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Phone Frame */}
          <div 
            className="relative rounded-[2.5rem] p-2 bg-black shadow-2xl"
            style={{ width: '280px' }}
          >
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />
            
            {/* Phone Screen */}
            <div 
              className="relative rounded-[2rem] overflow-hidden"
              style={{ 
                backgroundColor,
                height: '520px',
              }}
            >
              {/* Background Image/Video */}
              {backgroundVideoUrl ? (
                <video
                  src={backgroundVideoUrl}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : backgroundUrl ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-50"
                  style={{ backgroundImage: `url(${backgroundUrl})` }}
                />
              ) : null}

              {/* Gradient Overlay */}
              <div 
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${accentColor}20 0%, transparent 60%)`,
                }}
              />

              {/* Profile Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 overflow-y-auto">
                {/* Profile Card */}
                <motion.div
                  className="w-full rounded-2xl backdrop-blur-xl p-5 text-center"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    ...borderStyle,
                  }}
                >
                  {/* Avatar */}
                  {showAvatar && (
                    <div className="flex justify-center mb-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-20 h-20 object-cover shadow-lg"
                          style={{ 
                            borderRadius: getAvatarRadius(),
                            boxShadow: `0 0 20px ${accentColor}40`,
                          }}
                        />
                      ) : (
                        <div 
                          className="w-20 h-20 bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-2xl font-bold shadow-lg"
                          style={{ 
                            borderRadius: getAvatarRadius(),
                            color: textColor,
                            boxShadow: `0 0 20px ${accentColor}40`,
                          }}
                        >
                          {displayName?.charAt(0) || username?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display Name */}
                  {showDisplayName && displayName && (
                    <h2 
                      className="text-xl font-bold mb-0.5"
                      style={{ 
                        color: textColor,
                        fontFamily: nameFont,
                      }}
                    >
                      {displayName}
                    </h2>
                  )}

                  {/* Username */}
                  {showUsername && (
                    <p 
                      className="text-sm mb-2"
                      style={{ color: accentColor }}
                    >
                      @{username}
                    </p>
                  )}

                  {/* Badges */}
                  {showBadges && badges.length > 0 && (
                    <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
                      {badges.slice(0, 6).map((badge) => (
                        <div
                          key={badge.id}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${badge.color || accentColor}30` }}
                          title={badge.name}
                        >
                          {badge.icon_url ? (
                            <img src={badge.icon_url} alt={badge.name} className="w-4 h-4" />
                          ) : (
                            <span 
                              className="text-[10px] font-bold"
                              style={{ color: badge.color || accentColor }}
                            >
                              {badge.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {showDescription && bio && (
                    <p 
                      className="text-sm line-clamp-3 mb-3"
                      style={{ 
                        color: `${textColor}cc`,
                        fontFamily: textFont,
                      }}
                    >
                      {bio}
                    </p>
                  )}

                  {/* Views */}
                  {showViews && (
                    <div className="flex justify-center">
                      <span 
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ 
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
                        }}
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        {viewsCount.toLocaleString()} views
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Social Links */}
                {showLinks && socialLinks.length > 0 && (
                  <div className="w-full mt-4 space-y-2">
                    {socialLinks.slice(0, 3).map((link) => (
                      <div
                        key={link.id}
                        className="w-full rounded-xl backdrop-blur-sm p-3 flex items-center gap-3 transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          border: `1px solid ${accentColor}30`,
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${accentColor}20` }}
                        >
                          <span 
                            className="text-xs font-bold"
                            style={{ color: monochromeIcons ? iconColor : accentColor }}
                          >
                            {link.platform.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span 
                          className="text-sm font-medium truncate"
                          style={{ color: textColor }}
                        >
                          {link.title || link.platform}
                        </span>
                      </div>
                    ))}
                    {socialLinks.length > 3 && (
                      <p className="text-center text-xs text-muted-foreground">
                        +{socialLinks.length - 3} more links
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
