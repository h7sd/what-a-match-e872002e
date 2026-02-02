import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Map of allowed actions to prevent arbitrary queries
const ALLOWED_ACTIONS = [
  'get_stats',
  'get_featured_profiles',
  'get_public_profile',
  'get_profile_links',
  'get_profile_badges',
  'search_profiles',
  'get_global_badges',
  'check_username',
  'check_alias',
] as const;

type AllowedAction = typeof ALLOWED_ACTIONS[number];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    // Validate action is allowed
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        const limit = params?.limit || 50;
        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name')
          .limit(limit);
        
        if (error) throw error;
        // Only return minimal public data
        result = (data || []).map(p => ({
          u: p.username,
          d: p.display_name
        }));
        break;
      }

      case 'get_public_profile': {
        const { username, alias } = params || {};
        if (!username && !alias) {
          throw new Error('Username or alias required');
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
          icon_links_opacity, transparent_badges, ascii_size, ascii_waves, is_premium
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
        if (!username) throw new Error('Username required');

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
        if (!username) throw new Error('Username required');

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

        // Use RPC function to get badges without exposing user_id
        const { data, error } = await supabase.rpc('get_profile_badges', { 
          p_profile_id: profile.id 
        });

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'search_profiles': {
        const { query: searchQuery, limit = 10 } = params || {};
        if (!searchQuery || searchQuery.length < 2) {
          result = [];
          break;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .limit(limit);

        if (error) throw error;
        // Return minimal data only
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
          .order('created_at', { ascending: false });

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'check_username': {
        const { username } = params || {};
        if (!username) throw new Error('Username required');

        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        result = { exists: !!data };
        break;
      }

      case 'check_alias': {
        const { alias } = params || {};
        if (!alias) throw new Error('Alias required');

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

      default:
        throw new Error('Unknown action');
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
