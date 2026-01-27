import { motion } from 'framer-motion';
import { SiDiscord, SiSpotify } from 'react-icons/si';
import { Circle, Loader2 } from 'lucide-react';
import { useDiscordPresence, getActivityAssetUrl, LanyardActivity } from '@/hooks/useDiscordPresence';

interface DiscordPresenceProps {
  discordUserId: string;
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

const activityTypeLabels: Record<number, string> = {
  0: 'Playing',
  1: 'Streaming',
  2: 'Listening to',
  3: 'Watching',
  4: 'Custom Status',
  5: 'Competing in',
};

export function DiscordPresence({ discordUserId, accentColor = '#5865F2' }: DiscordPresenceProps) {
  const { data, isLoading, error } = useDiscordPresence(discordUserId);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm overflow-hidden rounded-xl bg-card/50 border border-border p-8 flex items-center justify-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (error || !data) {
    return null;
  }

  const mainActivity = data.activities[0];
  const activityImage = mainActivity ? getActivityAssetUrl(mainActivity) : null;

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
        {/* Avatar with decoration */}
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-background border-4 border-background overflow-hidden relative">
            <img 
              src={data.avatar} 
              alt={data.username} 
              className="w-full h-full object-cover" 
            />
          </div>
          {/* Avatar decoration */}
          {data.avatarDecoration && (
            <img 
              src={data.avatarDecoration}
              alt=""
              className="absolute -inset-2 w-20 h-20 pointer-events-none"
            />
          )}
          {/* Status indicator */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-background z-10"
            style={{ backgroundColor: statusColors[data.status] }}
          />
        </div>

        {/* Username */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground">
            {data.globalName || data.username}
          </span>
          <Circle
            className="w-2 h-2"
            fill={statusColors[data.status]}
            stroke={statusColors[data.status]}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-2">@{data.username}</p>

        {/* Spotify Activity */}
        {data.isListeningToSpotify && data.spotify && (
          <div className="flex items-start gap-3 mt-3 p-3 rounded-lg bg-[#1DB954]/20 border border-[#1DB954]/30">
            <img
              src={data.spotify.album_art_url}
              alt={data.spotify.album}
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs text-[#1DB954]">
                <SiSpotify className="w-3 h-3" />
                <span>Listening to Spotify</span>
              </div>
              <p className="font-medium text-foreground truncate">{data.spotify.song}</p>
              <p className="text-sm text-muted-foreground truncate">by {data.spotify.artist}</p>
            </div>
          </div>
        )}

        {/* Game/App Activity */}
        {!data.isListeningToSpotify && mainActivity && (
          <div className="flex items-start gap-3 mt-3 p-3 rounded-lg bg-black/30">
            {activityImage && (
              <img
                src={activityImage}
                alt={mainActivity.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {activityTypeLabels[mainActivity.type] || 'Playing'}
              </p>
              <p className="font-medium text-foreground truncate">{mainActivity.name}</p>
              {mainActivity.details && (
                <p className="text-sm text-muted-foreground truncate">{mainActivity.details}</p>
              )}
              {mainActivity.state && (
                <p className="text-sm text-muted-foreground truncate">{mainActivity.state}</p>
              )}
            </div>
          </div>
        )}

        {/* No activity */}
        {!data.isListeningToSpotify && !mainActivity && (
          <p className="text-sm text-muted-foreground">{statusLabels[data.status]}</p>
        )}
      </div>
    </motion.div>
  );
}

// Legacy props support for backwards compatibility
interface LegacyDiscordPresenceProps {
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activityName?: string;
  activityType?: string;
  activityDetails?: string;
  activityLargeImage?: string;
  accentColor?: string;
}

export function DiscordPresenceLegacy({
  username,
  avatar,
  status,
  activityName,
  activityType,
  activityDetails,
  activityLargeImage,
  accentColor = '#5865F2',
}: LegacyDiscordPresenceProps) {
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
      <div
        className="h-16 relative"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
        }}
      />

      <div className="p-4 -mt-8 relative">
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
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-background"
            style={{ backgroundColor: statusColors[status] }}
          />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground">{username}</span>
          <Circle
            className="w-2 h-2"
            fill={statusColors[status]}
            stroke={statusColors[status]}
          />
        </div>

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
