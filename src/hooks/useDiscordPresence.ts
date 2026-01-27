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

    let isMounted = true;

    const fetchPresence = async () => {
      try {
        const { data: result, error: fetchError } = await supabase.functions.invoke('discord-presence', {
          body: { discord_user_id: discordUserId }
        });

        if (fetchError) throw fetchError;
        
        if (result && isMounted) {
          // Parse activity image if it's a full URL
          const activities = (result.presence?.activities || []).map((activity: any) => ({
            ...activity,
            assets: activity.assets ? {
              ...activity.assets,
              large_image: activity.assets.large_image,
            } : undefined,
          }));

          // Check if listening to Spotify (activity type 2 or activity_type contains Listening)
          const isSpotify = result.presence?.listening_to_spotify || 
            activities.some((a: any) => a.type === 2 || a.name === 'Spotify');

          // Build Spotify data if listening
          let spotifyData: LanyardSpotify | undefined;
          if (isSpotify && activities.length > 0) {
            const spotifyActivity = activities.find((a: any) => a.type === 2 || a.name === 'Spotify');
            if (spotifyActivity?.details) {
              // Parse "Song by Artist" format
              const parts = spotifyActivity.details.split(' by ');
              spotifyData = {
                track_id: '',
                timestamps: { start: Date.now(), end: Date.now() + 180000 },
                album: '',
                album_art_url: spotifyActivity.assets?.large_image || '',
                artist: parts[1] || '',
                song: parts[0] || spotifyActivity.details,
              };
            }
          }

          const transformed: DiscordPresenceData = {
            username: result.user.username,
            globalName: result.user.global_name,
            avatar: result.user.avatar,
            avatarDecoration: result.user.avatar_decoration,
            status: result.presence?.status || 'offline',
            activities: activities.filter((a: any) => a.type !== 2), // Filter Spotify from activities
            spotify: spotifyData,
            isListeningToSpotify: !!spotifyData,
          };
          setData(transformed);
        }
      } catch (err) {
        console.error('Error fetching Discord presence:', err);
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPresence();

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchPresence, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [discordUserId]);

  return { data, isLoading, error };
}

export function getActivityAssetUrl(activity: LanyardActivity): string | null {
  if (!activity.assets?.large_image) return null;
  
  const image = activity.assets.large_image;
  
  // If it's already a full URL, return it
  if (image.startsWith('http')) {
    return image;
  }
  
  if (image.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${image.replace('mp:external/', '')}`;
  } else if (image.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${image.replace('spotify:', '')}`;
  } else if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }
  
  return null;
}
