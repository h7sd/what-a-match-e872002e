import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_user_id } = await req.json();
    
    if (!discord_user_id) {
      return new Response(
        JSON.stringify({ error: 'discord_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user from Discord API
    const userResponse = await fetch(`https://discord.com/api/v10/users/${discord_user_id}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user:', userResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Discord user', status: userResponse.status }),
        { status: userResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const discordUser = await userResponse.json();
    console.log('Fetched Discord user:', discordUser.username);

    // Build avatar URL
    let avatarUrl = null;
    if (discordUser.avatar) {
      const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'webp';
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=256`;
    } else {
      // Default avatar
      const defaultAvatarIndex = discordUser.discriminator === '0' 
        ? (BigInt(discordUser.id) >> 22n) % 6n 
        : parseInt(discordUser.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }

    // Build avatar decoration URL
    let avatarDecorationUrl = null;
    if (discordUser.avatar_decoration_data?.asset) {
      avatarDecorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration_data.asset}.png`;
    }

    // Try to get presence from Lanyard (real-time status)
    let presenceData = null;
    try {
      const lanyardResponse = await fetch(`https://api.lanyard.rest/v1/users/${discord_user_id}`);
      if (lanyardResponse.ok) {
        const lanyardData = await lanyardResponse.json();
        if (lanyardData.success) {
          presenceData = lanyardData.data;
          console.log('Got Lanyard presence data for', discordUser.username);
        }
      }
    } catch (e) {
      console.log('Lanyard not available, using bot data only');
    }

    // Combine bot user data with Lanyard presence
    const result = {
      user: {
        id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name,
        avatar: avatarUrl,
        avatar_decoration: avatarDecorationUrl,
        banner_color: discordUser.banner_color,
      },
      presence: presenceData ? {
        status: presenceData.discord_status,
        activities: presenceData.activities?.filter((a: any) => a.type !== 4) || [],
        spotify: presenceData.spotify,
        listening_to_spotify: presenceData.listening_to_spotify,
        active_on_discord_desktop: presenceData.active_on_discord_desktop,
        active_on_discord_mobile: presenceData.active_on_discord_mobile,
        active_on_discord_web: presenceData.active_on_discord_web,
      } : {
        status: 'offline',
        activities: [],
        spotify: null,
        listening_to_spotify: false,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discord-presence function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
