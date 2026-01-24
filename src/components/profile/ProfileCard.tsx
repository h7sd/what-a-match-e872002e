import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, MapPin, Briefcase } from 'lucide-react';
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
        className="relative rounded-2xl p-8 backdrop-blur-xl border overflow-hidden"
        style={{
          backgroundColor: profile.card_color || 'rgba(0,0,0,0.6)',
          borderColor: `${accentColor}30`,
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
          {/* Avatar with glow */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative mb-6"
          >
            <motion.div
              className="absolute -inset-2 blur-lg opacity-60"
              style={{ backgroundColor: accentColor }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <Avatar 
              className={`w-28 h-28 ring-2 ring-white/20 relative ${avatarClasses[avatarShape as keyof typeof avatarClasses] || 'rounded-full'}`}
            >
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.display_name || profile.username}
                className="object-cover"
              />
              <AvatarFallback 
                className="text-3xl text-foreground"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)` }}
              >
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Display Name */}
          <h1 
            className="text-2xl font-bold mb-1"
            style={{ 
              fontFamily: (profile as any).name_font || 'Inter',
              color: 'white',
            }}
          >
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

          {/* Stats */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            <motion.span
              key={profile.views_count}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {profile.views_count.toLocaleString()} views
            </motion.span>
            <motion.span
              className="ml-1"
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: accentColor }}
            >
              ✦
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
