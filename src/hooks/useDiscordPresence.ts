import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LanyardActivity {
  name: string;
  type: number;
  state?: string;
  details?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  application_id?: string;
}

export interface LanyardSpotify {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  album: string;
  album_art_url: string;
  artist: string;
  song: string;
}

export interface DiscordPresenceData {
  username: string;
  globalName?: string;
  avatar: string;
  avatarDecoration?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: LanyardActivity[];
  spotify?: LanyardSpotify;
  isListeningToSpotify: boolean;
}

export function useDiscordPresence(discordUserId: string | null | undefined) {
  const [data, setData] = useState<DiscordPresenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!discordUserId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let ws: WebSocket | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const fetchFromEdgeFunction = async () => {
      try {
        const { data: result, error: fetchError } = await supabase.functions.invoke('discord-presence', {
          body: { discord_user_id: discordUserId }
        });

        if (fetchError) throw fetchError;
        
        if (result && isMounted) {
          const transformed: DiscordPresenceData = {
            username: result.user.username,
            globalName: result.user.global_name,
            avatar: result.user.avatar,
            avatarDecoration: result.user.avatar_decoration,
            status: result.presence?.status || 'offline',
            activities: result.presence?.activities || [],
            spotify: result.presence?.spotify,
            isListeningToSpotify: result.presence?.listening_to_spotify || false,
          };
          setData(transformed);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Edge function error, falling back to Lanyard:', err);
        // Fallback to direct Lanyard if edge function fails
        fetchFromLanyard();
      }
    };

    const fetchFromLanyard = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
        const result = await res.json();
        
        if (result.success && result.data && isMounted) {
          setData(transformLanyardData(result.data));
          setIsLoading(false);
        } else {
          setError(new Error('User not found on Lanyard'));
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://api.lanyard.rest/socket');

        ws.onopen = () => {
          ws?.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: discordUserId }
          }));
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.op === 1) {
            const heartbeatMs = message.d.heartbeat_interval;
            heartbeatInterval = setInterval(() => {
              ws?.send(JSON.stringify({ op: 3 }));
            }, heartbeatMs);
          } else if (message.op === 0) {
            if (message.t === 'INIT_STATE' || message.t === 'PRESENCE_UPDATE') {
              if (isMounted) {
                setData(transformLanyardData(message.d));
                setIsLoading(false);
              }
            }
          }
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
      } catch {
        // WebSocket failed silently
      }
    };

    // First fetch from edge function (bot), then setup WebSocket for real-time
    fetchFromEdgeFunction();
    connectWebSocket();

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (ws) ws.close();
    };
  }, [discordUserId]);

  return { data, isLoading, error };
}

interface LanyardData {
  discord_user: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    global_name?: string;
    avatar_decoration_data?: {
      asset: string;
      sku_id: string;
    };
  };
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: LanyardActivity[];
  spotify?: LanyardSpotify;
  listening_to_spotify: boolean;
}

function transformLanyardData(lanyardData: LanyardData): DiscordPresenceData {
  const { discord_user, discord_status, activities, spotify, listening_to_spotify } = lanyardData;
  
  const avatarUrl = discord_user.avatar 
    ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_user.discriminator || '0') % 5}.png`;

  const avatarDecoration = discord_user.avatar_decoration_data?.asset
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${discord_user.avatar_decoration_data.asset}.png`
    : undefined;

  return {
    username: discord_user.username,
    globalName: discord_user.global_name,
    avatar: avatarUrl,
    avatarDecoration,
    status: discord_status,
    activities: activities.filter(a => a.type !== 4),
    spotify,
    isListeningToSpotify: listening_to_spotify
  };
}

export function getActivityAssetUrl(activity: LanyardActivity): string | null {
  if (!activity.assets?.large_image || !activity.application_id) return null;
  
  const image = activity.assets.large_image;
  
  if (image.startsWith('mp:external/')) {
    const externalUrl = image.replace('mp:external/', '');
    return `https://media.discordapp.net/external/${externalUrl}`;
  } else if (image.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${image.replace('spotify:', '')}`;
  } else {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }
}
