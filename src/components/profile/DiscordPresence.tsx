import { motion } from 'framer-motion';
import { SiDiscord } from 'react-icons/si';
import { Circle } from 'lucide-react';

interface DiscordPresenceProps {
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activityName?: string;
  activityType?: string;
  activityDetails?: string;
  activityLargeImage?: string;
  accentColor?: string;
}

const statusColors = {
  online: '#22c55e',
  idle: '#f59e0b',
  dnd: '#ef4444',
  offline: '#6b7280',
};

const statusLabels = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

export function DiscordPresence({
  username,
  avatar,
  status,
  activityName,
  activityType,
  activityDetails,
  activityLargeImage,
  accentColor = '#5865F2',
}: DiscordPresenceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${accentColor}20, transparent)`,
        border: `1px solid ${accentColor}40`,
      }}
    >
      {/* Header with gradient */}
      <div
        className="h-16 relative"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
        }}
      />

      <div className="p-4 -mt-8 relative">
        {/* Avatar */}
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-background border-4 border-background overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#5865F2] flex items-center justify-center">
                <SiDiscord className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          {/* Status indicator */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-background"
            style={{ backgroundColor: statusColors[status] }}
          />
        </div>

        {/* Username */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground">{username}</span>
          <Circle
            className="w-2 h-2"
            fill={statusColors[status]}
            stroke={statusColors[status]}
          />
        </div>

        {/* Activity */}
        {activityName && (
          <div className="flex items-start gap-3 mt-3 p-3 rounded-lg bg-black/30">
            {activityLargeImage && (
              <img
                src={activityLargeImage}
                alt={activityName}
                className="w-14 h-14 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {activityType || 'Playing'}
              </p>
              <p className="font-medium text-foreground truncate">{activityName}</p>
              {activityDetails && (
                <p className="text-sm text-muted-foreground truncate">{activityDetails}</p>
              )}
            </div>
          </div>
        )}

        {!activityName && (
          <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
        )}
      </div>
    </motion.div>
  );
}
