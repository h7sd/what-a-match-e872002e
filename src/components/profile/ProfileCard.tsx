import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, Music } from 'lucide-react';
import type { Profile } from '@/hooks/useProfile';
import { TypewriterText } from './TypewriterText';
import { SparkleEffect } from './SparkleEffect';

interface ProfileCardProps {
  profile: Profile;
  badges?: Array<{ id: string; name: string; color: string | null }>;
}

export function ProfileCard({ profile, badges = [] }: ProfileCardProps) {
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
      className="relative"
    >
      {/* Glow effect behind card */}
      {profile.effects_config?.glow && (
        <div
          className="absolute -inset-4 rounded-3xl blur-xl opacity-30"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div
        className="glass-card p-8 relative overflow-hidden"
        style={{
          backgroundColor: profile.card_color || 'rgba(0,0,0,0.5)',
        }}
      >
        {/* Sparkle effects */}
        {profile.effects_config?.sparkles && <SparkleEffect />}

        {/* Gradient border glow */}
        <div
          className="absolute inset-0 rounded-xl opacity-50"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, transparent, ${accentColor}10)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative mb-6"
          >
            <div
              className="absolute -inset-1 rounded-full blur-md opacity-60"
              style={{ backgroundColor: accentColor }}
            />
            <Avatar className="w-28 h-28 ring-2 ring-white/20 relative">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.display_name || profile.username}
              />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Display Name */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {profile.effects_config?.typewriter ? (
              <TypewriterText text={profile.display_name || profile.username} />
            ) : (
              profile.display_name || profile.username
            )}
          </h1>

          {/* Username */}
          <p className="text-muted-foreground text-sm mb-3">@{profile.username}</p>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {badges.map((badge) => (
                <Badge
                  key={badge.id}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-xs"
                  style={{ borderColor: badge.color || accentColor }}
                >
                  {badge.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{profile.views_count.toLocaleString()} views</span>
            </div>
            {profile.music_url && (
              <div className="flex items-center gap-1">
                <Music className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Playing music</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
