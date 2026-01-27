import { motion } from 'framer-motion';
import { SiSpotify } from 'react-icons/si';
import { Loader2, Heart } from 'lucide-react';
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

const statusDotStyles = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

const activityTypeLabels: Record<number, string> = {
  0: 'Playing',
  1: 'Streaming',
  2: 'Listening to',
  3: 'Watching',
  5: 'Competing in',
};

export function DiscordPresence({ discordUserId, accentColor = '#8b5cf6' }: DiscordPresenceProps) {
  const { data, isLoading, error } = useDiscordPresence(discordUserId);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-4 flex items-center justify-center"
      >
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </motion.div>
    );
  }

  if (error || !data) {
    return null;
  }

  const mainActivity = data.activities[0];
  const activityImage = mainActivity ? getActivityAssetUrl(mainActivity) : null;

  // Spotify takes priority if listening
  if (data.isListeningToSpotify && data.spotify) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10"
      >
        <div className="p-3 sm:p-4 flex items-center gap-3">
          {/* Avatar with status indicator */}
          <div className="relative flex-shrink-0">
            <img 
              src={data.avatar} 
              alt={data.username}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-white/20"
            />
            {data.avatarDecoration && (
              <img 
                src={data.avatarDecoration}
                alt=""
                className="absolute -inset-1 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none"
              />
            )}
            {/* Status dot - bottom left like reference */}
            <div
              className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-[3px] border-black/80 ${statusDotStyles[data.status]}`}
            />
          </div>

          {/* User info and activity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-white text-sm">
                {data.globalName || data.username}
              </span>
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
                style={{ backgroundColor: '#ec4899', color: 'white' }}
              >
                <Heart className="w-2 h-2 fill-current" />
                UV
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[#1DB954] text-xs mt-0.5">
              <SiSpotify className="w-3 h-3" />
              <span className="font-medium">Listening to Spotify</span>
            </div>
            <p className="text-white/90 text-xs truncate mt-0.5">{data.spotify.song}</p>
            <p className="text-white/50 text-xs truncate">by {data.spotify.artist}</p>
          </div>

          {/* Spotify album art - larger like reference */}
          <img
            src={data.spotify.album_art_url}
            alt={data.spotify.album}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 shadow-lg"
          />
        </div>
      </motion.div>
    );
  }

  // Game/App Activity
  if (mainActivity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10"
      >
        <div className="p-3 sm:p-4 flex items-center gap-3">
          {/* Avatar with status indicator */}
          <div className="relative flex-shrink-0">
            <img 
              src={data.avatar} 
              alt={data.username}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-white/20"
            />
            {data.avatarDecoration && (
              <img 
                src={data.avatarDecoration}
                alt=""
                className="absolute -inset-1 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none"
              />
            )}
            {/* Status dot - bottom left like reference */}
            <div
              className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-[3px] border-black/80 ${statusDotStyles[data.status]}`}
            />
          </div>

          {/* User info and activity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-white text-sm">
                {data.globalName || data.username}
              </span>
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
                style={{ backgroundColor: '#ec4899', color: 'white' }}
              >
                <Heart className="w-2 h-2 fill-current" />
                UV
              </span>
            </div>
            <p className="text-white/80 text-xs mt-0.5">
              <span className="text-primary font-medium">{activityTypeLabels[mainActivity.type] || 'Playing'}</span>
              {' '}{mainActivity.name}
            </p>
            {mainActivity.details && (
              <p className="text-white/60 text-xs truncate">{mainActivity.details}</p>
            )}
            {mainActivity.state && (
              <p className="text-white/40 text-xs truncate">{mainActivity.state}</p>
            )}
          </div>

          {/* Activity image - larger like reference */}
          {activityImage && (
            <img
              src={activityImage}
              alt={mainActivity.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 shadow-lg"
            />
          )}
        </div>
      </motion.div>
    );
  }

  // Just status, no activity
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10"
    >
      <div className="p-3 sm:p-4 flex items-center gap-3">
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          <img 
            src={data.avatar} 
            alt={data.username}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-white/20"
          />
          {data.avatarDecoration && (
            <img 
              src={data.avatarDecoration}
              alt=""
              className="absolute -inset-1 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none"
            />
          )}
          {/* Status dot - bottom left like reference */}
          <div
            className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-[3px] border-black/80 ${statusDotStyles[data.status]}`}
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-sm">
              {data.globalName || data.username}
            </span>
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
              style={{ backgroundColor: '#ec4899', color: 'white' }}
            >
              <Heart className="w-2 h-2 fill-current" />
              UV
            </span>
          </div>
          <p className="text-white/50 text-xs capitalize mt-0.5">{data.status}</p>
        </div>
      </div>
    </motion.div>
  );
}
