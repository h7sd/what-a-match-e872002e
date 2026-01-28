import { motion } from 'framer-motion';
import { Eye, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Badge {
  id: string;
  name: string;
  color?: string | null;
  icon_url?: string | null;
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
  viewsCount?: number;
  badges?: Badge[];
  cardBorderEnabled: boolean;
  cardBorderColor?: string;
  cardBorderWidth: number;
  nameFont: string;
  textFont: string;
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
  viewsCount = 0,
  badges = [],
  cardBorderEnabled,
  cardBorderColor,
  cardBorderWidth,
  nameFont,
  textFont,
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
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <Link to={`/${username}`} target="_blank">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ExternalLink className="w-3 h-3" />
            Open Profile
          </Button>
        </Link>
      </div>

      {/* Preview Container */}
      <div 
        className="relative rounded-xl overflow-hidden"
        style={{ 
          backgroundColor,
          minHeight: '280px',
        }}
      >
        {/* Background Image/Video */}
        {backgroundVideoUrl ? (
          <video
            src={backgroundVideoUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : backgroundUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
        ) : null}

        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accentColor}15 0%, transparent 50%)`,
          }}
        />

        {/* Profile Card Preview */}
        <div className="relative z-10 flex items-center justify-center p-6 min-h-[280px]">
          <motion.div
            className="w-full max-w-[280px] rounded-2xl backdrop-blur-xl p-5 text-center"
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
                    className="w-16 h-16 object-cover"
                    style={{ borderRadius: getAvatarRadius() }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-xl font-bold"
                    style={{ 
                      borderRadius: getAvatarRadius(),
                      color: textColor,
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
                className="text-lg font-bold mb-0.5"
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
                className="text-xs mb-2"
                style={{ color: accentColor }}
              >
                @{username}
              </p>
            )}

            {/* Badges */}
            {showBadges && badges.length > 0 && (
              <div className="flex justify-center gap-1 mb-2 flex-wrap">
                {badges.slice(0, 4).map((badge) => (
                  <div
                    key={badge.id}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.color || accentColor }}
                    title={badge.name}
                  >
                    {badge.icon_url ? (
                      <img src={badge.icon_url} alt={badge.name} className="w-3 h-3" />
                    ) : (
                      <span className="text-[8px] text-white font-bold">
                        {badge.name.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {badges.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{badges.length - 4}</span>
                )}
              </div>
            )}

            {/* Bio */}
            {showDescription && bio && (
              <p 
                className="text-xs line-clamp-2 mb-2"
                style={{ 
                  color: `${textColor}99`,
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
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${accentColor}20`,
                    color: accentColor,
                  }}
                >
                  {viewsCount.toLocaleString()} views
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
