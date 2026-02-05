import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

interface DiscordOAuthResult {
  success: boolean;
  is_new_user?: boolean;
  email?: string;
  action_link?: string;
  discord_user?: DiscordUser;
  error?: string;
}

export function useDiscordOAuth() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getRedirectUri = useCallback(() => {
    // Use the proxy URL for the callback to hide Supabase project ID
    return `https://api.uservault.cc/functions/v1/discord-oauth-callback`;
  }, []);

  const initiateDiscordLogin = useCallback(async () => {
    setLoading(true);
    try {
      // Always redirect to uservault.cc after Discord login
      const targetOrigin = 'https://uservault.cc';
      
      // Get the OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('discord-oauth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: getRedirectUri(),
          frontend_origin: targetOrigin
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to get Discord auth URL');
      }

      // Store state in sessionStorage for verification
      sessionStorage.setItem('discord_oauth_state', data.state);
      sessionStorage.setItem('discord_oauth_mode', 'login');

      // Redirect to Discord
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Discord OAuth error:', err);
      toast({
        title: 'Discord login failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [getRedirectUri, toast]);

  const initiateDiscordLink = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Always redirect to uservault.cc after Discord link
      const targetOrigin = 'https://uservault.cc';
      
      const { data, error } = await supabase.functions.invoke('discord-oauth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: getRedirectUri(),
          frontend_origin: targetOrigin
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to get Discord auth URL');
      }

      // Store state and mode for callback
      sessionStorage.setItem('discord_oauth_state', data.state);
      sessionStorage.setItem('discord_oauth_mode', 'link');
      sessionStorage.setItem('discord_oauth_user_id', userId);

      // Redirect to Discord
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Discord link error:', err);
      toast({
        title: 'Failed to link Discord',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [getRedirectUri, toast]);

  const handleOAuthCallback = useCallback(async (code: string, state: string): Promise<DiscordOAuthResult> => {
    setLoading(true);
    try {
      const storedState = sessionStorage.getItem('discord_oauth_state');
      const mode = sessionStorage.getItem('discord_oauth_mode') || 'login';
      const userId = sessionStorage.getItem('discord_oauth_user_id');

      // Verify state
      if (!storedState || storedState !== state) {
        throw new Error('Invalid OAuth state. Please try again.');
      }

      // Clear stored state
      sessionStorage.removeItem('discord_oauth_state');
      sessionStorage.removeItem('discord_oauth_mode');
      sessionStorage.removeItem('discord_oauth_user_id');

      // Exchange code for tokens and user info
      const { data, error } = await supabase.functions.invoke('discord-oauth-callback', {
        body: {
          code,
          state,
          redirect_uri: getRedirectUri(),
          mode,
          user_id: userId,
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'OAuth callback failed');
      }

      // If login mode and we got an action link, use it to sign in
      if (mode === 'login' && data.action_link) {
        // Parse the magic link and extract token
        const magicUrl = new URL(data.action_link);
        const hashParams = new URLSearchParams(magicUrl.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            // Fallback: redirect to magic link
            window.location.href = data.action_link;
            return { success: true, ...data };
          }
        } else {
          // Fallback: redirect to magic link
          window.location.href = data.action_link;
          return { success: true, ...data };
        }
      }

      return { success: true, ...data };
    } catch (err: any) {
      console.error('Discord callback error:', err);
      toast({
        title: 'Discord authentication failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getRedirectUri, toast]);

  return {
    loading,
    initiateDiscordLogin,
    initiateDiscordLink,
    handleOAuthCallback,
  };
}
