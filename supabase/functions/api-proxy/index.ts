import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Check rate limit for IP
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupRateLimitStore();
  
  const now = Date.now();
  const key = ip;
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetTime: entry.resetTime };
}

// Hash IP for logging (privacy)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
}

// Map of allowed actions to prevent arbitrary queries
const ALLOWED_ACTIONS = [
  'get_stats',
  'get_featured_profiles',
  'get_featured_profiles_full', // NEW: batch endpoint with profile+badges in one call
  'get_public_profile',
  'get_profile_links',
  'get_profile_badges',
  'search_profiles',
  'get_global_badges',
  'check_username',
  'check_alias',
  'get_hero_avatars',
] as const;

type AllowedAction = typeof ALLOWED_ACTIONS[number];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  
  // Check rate limit
  const rateLimit = checkRateLimit(clientIp);
  
  const rateLimitHeaders = {
    ...corsHeaders,
    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    const ipHash = await hashIP(clientIp);
    console.log(`Rate limit exceeded for IP hash: ${ipHash}`);
    
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { 
        status: 429, 
        headers: { 
          ...rateLimitHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        } 
      }
    );
  }

  try {
    const { action, params } = await req.json();

    // Validate action is allowed
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (action as AllowedAction) {
      case 'get_stats': {
        // Get total views and user count without exposing any user data
        const [viewsResult, usersResult] = await Promise.all([
          supabase.from('profiles').select('views_count'),
          supabase.from('profiles').select('id', { count: 'exact', head: true })
        ]);
        
        const totalViews = (viewsResult.data || []).reduce((sum, p) => sum + (p.views_count || 0), 0);
        result = { 
          totalViews,
          totalUsers: usersResult.count || 0
        };
        break;
      }

      case 'get_featured_profiles': {
        const limit = Math.min(params?.limit || 50, 1000); // Cap at 1000
        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name, uid_number')
          .order('uid_number', { ascending: true })
          .limit(limit);
        
        if (error) throw error;
        // Only return minimal public data with obfuscated keys
        result = (data || []).map(p => ({
          u: p.username,
          d: p.display_name,
          n: p.uid_number // uid_number
        }));
        break;
      }

      case 'get_featured_profiles_full': {
        // BATCH endpoint: returns profiles with background + badges in ONE request
        // This replaces 60+ separate API calls with a single call
        const limit = Math.min(params?.limit || 15, 30); // Cap at 30 for performance
        
        // Get profiles that have backgrounds (required for card swap display)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id, username, display_name, bio, avatar_url, background_url,
            background_video_url, background_color, accent_color, card_color,
            views_count, uid_number, avatar_shape, name_font, text_font,
            text_color, show_username, show_display_name, show_badges,
            show_views, show_avatar, show_description, card_border_enabled,
            card_border_width, card_border_color, transparent_badges, is_premium,
            display_name_animation
          `)
          .or('background_url.neq.,background_video_url.neq.')
          .order('uid_number', { ascending: true })
          .limit(limit * 2); // Fetch more to have buffer after filtering
        
        if (profilesError) throw profilesError;
        
        // Filter to only profiles with actual backgrounds
        const validProfiles = (profiles || []).filter(p => 
          p.background_url || p.background_video_url
        ).slice(0, limit);
        
        if (validProfiles.length === 0) {
          result = [];
          break;
        }
        
        // Get all badges for these profiles in ONE query
        const profileIds = validProfiles.map(p => p.id);
        
        // Get user badges (global badges assigned to users)
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select(`
            user_id,
            display_order,
            custom_color,
            is_enabled,
            global_badges:badge_id (
              id, name, description, icon_url, color, rarity
            )
          `)
          .in('user_id', profileIds)
          .eq('is_enabled', true);
        
        // Get friend badges for these profiles
        const { data: friendBadges } = await supabase
          .from('friend_badges')
          .select('recipient_id, id, name, description, icon_url, color, display_order, is_enabled')
          .in('recipient_id', profileIds)
          .eq('is_enabled', true);
        
        // Build badge map by profile ID
        const badgesByProfileId = new Map<string, any[]>();
        
        // Process user badges
        for (const ub of (userBadges || [])) {
          if (!ub.global_badges) continue;
          const badge = ub.global_badges as any;
          const badges = badgesByProfileId.get(ub.user_id) || [];
          badges.push({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon_url: badge.icon_url,
            color: ub.custom_color || badge.color,
            rarity: badge.rarity,
            display_order: ub.display_order,
            badge_type: 'global'
          });
          badgesByProfileId.set(ub.user_id, badges);
        }
        
        // Process friend badges
        for (const fb of (friendBadges || [])) {
          const badges = badgesByProfileId.get(fb.recipient_id) || [];
          badges.push({
            id: fb.id,
            name: fb.name,
            description: fb.description,
            icon_url: fb.icon_url,
            color: fb.color,
            display_order: fb.display_order,
            badge_type: 'friend'
          });
          badgesByProfileId.set(fb.recipient_id, badges);
        }
        
        // Sort badges by display_order
        for (const [profileId, badges] of badgesByProfileId) {
          badges.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        }
        
        // Build final result - profile + badges combined
        result = validProfiles.map(p => ({
          profile: {
            username: p.username,
            display_name: p.display_name,
            bio: p.bio,
            avatar_url: p.avatar_url,
            background_url: p.background_url,
            background_video_url: p.background_video_url,
            background_color: p.background_color,
            accent_color: p.accent_color,
            card_color: p.card_color,
            views_count: p.views_count,
            uid_number: p.uid_number,
            avatar_shape: p.avatar_shape,
            name_font: p.name_font,
            text_font: p.text_font,
            text_color: p.text_color,
            show_username: p.show_username,
            show_display_name: p.show_display_name,
            show_badges: p.show_badges,
            show_views: p.show_views,
            show_avatar: p.show_avatar,
            show_description: p.show_description,
            card_border_enabled: p.card_border_enabled,
            card_border_width: p.card_border_width,
            card_border_color: p.card_border_color,
            transparent_badges: p.transparent_badges,
            is_premium: p.is_premium,
            display_name_animation: p.display_name_animation
          },
          badges: badgesByProfileId.get(p.id) || []
        }));
        break;
      }

      case 'get_public_profile': {
        const { username, alias } = params || {};
        if (!username && !alias) {
          throw new Error('Username or alias required');
        }

        // Validate input length to prevent abuse
        if ((username && username.length > 50) || (alias && alias.length > 50)) {
          throw new Error('Invalid input');
        }

        let query = supabase.from('profiles').select(`
          username, display_name, bio, avatar_url, background_url,
          background_color, accent_color, card_color, effects_config,
          music_url, views_count, uid_number, created_at, updated_at,
          background_video_url, avatar_shape, name_font, text_font,
          occupation, location, discord_user_id, layout_style, card_style,
          text_color, icon_color, custom_cursor_url, og_title, og_description,
          og_image_url, og_icon_url, og_title_animation, background_effect,
          discord_card_style, discord_badge_color, discord_card_opacity,
          discord_show_badge, discord_avatar_decoration, use_discord_avatar,
          start_screen_enabled, start_screen_text, start_screen_font,
          start_screen_color, start_screen_bg_color, start_screen_animation,
          show_volume_control, show_username, show_badges, show_views,
          show_avatar, show_links, show_description, show_display_name,
          card_border_enabled, card_border_width, card_border_color,
          audio_volume, profile_opacity, profile_blur, monochrome_icons,
          animated_title, swap_bio_colors, glow_username, glow_socials,
          glow_badges, enable_profile_gradient, icon_only_links,
          icon_links_opacity, transparent_badges, ascii_size, ascii_waves, is_premium,
          display_name_animation, show_likes, show_comments, likes_count, dislikes_count
        `);

        if (alias) {
          query = query.eq('alias_username', alias.toLowerCase());
        } else {
          query = query.eq('username', username.toLowerCase());
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      case 'get_profile_links': {
        const { username } = params || {};
        if (!username || username.length > 50) throw new Error('Invalid username');

        // First get profile ID without exposing it
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .single();

        if (!profile) {
          result = [];
          break;
        }

        const { data, error } = await supabase
          .from('social_links')
          .select('platform, url, title, icon, description, style, display_order, is_visible')
          .eq('profile_id', profile.id)
          .eq('is_visible', true)
          .order('display_order');

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'get_profile_badges': {
        const { username } = params || {};
        if (!username || username.length > 50) throw new Error('Invalid username');

        // Get profile ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .single();

        if (!profile) {
          result = [];
          break;
        }

        // Use RPC function to get badges including friend badges and stolen badges
        const { data, error } = await supabase.rpc('get_profile_badges_with_friends', { 
          p_profile_id: profile.id 
        });

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'search_profiles': {
        const { query: searchQuery, limit = 10 } = params || {};
        if (!searchQuery || searchQuery.length < 2 || searchQuery.length > 50) {
          result = [];
          break;
        }

        // Sanitize search query
        const sanitizedQuery = searchQuery.replace(/[%_]/g, '');

        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .or(`username.ilike.%${sanitizedQuery}%,display_name.ilike.%${sanitizedQuery}%`)
          .limit(Math.min(limit, 20)); // Cap at 20

        if (error) throw error;
        // Return minimal data only with obfuscated keys
        result = (data || []).map(p => ({
          u: p.username,
          d: p.display_name,
          a: p.avatar_url
        }));
        break;
      }

      case 'get_global_badges': {
        const { data, error } = await supabase
          .from('global_badges')
          .select('name, description, icon_url, color, rarity, is_limited, max_claims, claims_count')
          .order('created_at', { ascending: false })
          .limit(100); // Cap results

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'check_username': {
        const { username } = params || {};
        if (!username || username.length > 50) throw new Error('Invalid input');

        const normalizedUsername = username.toLowerCase();

        // Check BOTH username AND alias_username columns
        // A handle is taken if it exists in either column
        const [asUsername, asAlias] = await Promise.all([
          supabase
            .from('profiles')
            .select('id')
            .eq('username', normalizedUsername)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('id')
            .eq('alias_username', normalizedUsername)
            .maybeSingle()
        ]);

        // Return minimal response - no details about WHERE it's taken
        result = { exists: !!(asUsername.data || asAlias.data) };
        break;
      }

      case 'check_alias': {
        const { alias } = params || {};
        if (!alias || alias.length > 50) throw new Error('Invalid alias');

        const { data: asUsername } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', alias.toLowerCase())
          .maybeSingle();

        const { data: asAlias } = await supabase
          .from('profiles')
          .select('alias_username')
          .eq('alias_username', alias.toLowerCase())
          .maybeSingle();

        result = { exists: !!(asUsername || asAlias) };
        break;
      }

      case 'get_hero_avatars': {
        // Fetch avatar URLs for uid 1-5, returns only URLs (no IDs/metadata)
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .in('uid_number', [1, 2, 3, 4, 5])
          .order('uid_number');

        if (error) throw error;

        // Proxy URL to hide Supabase infrastructure
        const PROXY_URL = 'https://api.uservault.cc';
        const supabaseUrlPattern = /https:\/\/[a-z0-9]+\.supabase\.co/gi;

        // Return only non-null avatar URLs, transformed through proxy
        const avatars = (data || [])
          .map(p => p.avatar_url)
          .filter(Boolean)
          .map((url: string) => {
            // Replace Supabase URL with proxy URL
            return url.replace(supabaseUrlPattern, PROXY_URL);
          });

        // Shuffle for randomness
        for (let i = avatars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [avatars[i], avatars[j]] = [avatars[j], avatars[i]];
        }

        result = avatars;
        break;
      }

      default:
        throw new Error('Unknown action');
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
