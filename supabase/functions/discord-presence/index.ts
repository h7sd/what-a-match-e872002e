import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First check if we have presence data from the bot in the database
    const { data: presenceData, error: presenceError } = await supabase
      .from('discord_presence')
      .select('*')
      .eq('discord_user_id', discord_user_id)
      .maybeSingle();

    if (presenceData) {
      // We have data from the bot, use it
      console.log('Using bot presence data for:', presenceData.username);
      
      return new Response(
        JSON.stringify({
          source: 'bot',
          user: {
            id: discord_user_id,
            username: presenceData.username,
            global_name: presenceData.username,
            avatar: presenceData.avatar,
            avatar_decoration: null,
          },
          presence: {
            status: presenceData.status || 'offline',
            activities: presenceData.activity_name ? [{
              name: presenceData.activity_name,
              type: getActivityTypeNumber(presenceData.activity_type),
              details: presenceData.activity_details,
              state: presenceData.activity_state,
              assets: presenceData.activity_large_image ? {
                large_image: presenceData.activity_large_image,
              } : undefined,
            }] : [],
            spotify: null,
            listening_to_spotify: presenceData.activity_type === 'Listening to',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Fetch basic user info from Discord API
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userResponse = await fetch(`https://discord.com/api/v10/users/${discord_user_id}`, {
      headers: { 'Authorization': `Bot ${botToken}` },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Discord user' }),
        { status: userResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const discordUser = await userResponse.json();
    console.log('Fetched Discord user (no presence):', discordUser.username);

    let avatarUrl = null;
    if (discordUser.avatar) {
      const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'webp';
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=256`;
    } else {
      const defaultAvatarIndex = discordUser.discriminator === '0' 
        ? (BigInt(discordUser.id) >> 22n) % 6n 
        : parseInt(discordUser.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }

    let avatarDecorationUrl = null;
    if (discordUser.avatar_decoration_data?.asset) {
      avatarDecorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration_data.asset}.png`;
    }

    return new Response(
      JSON.stringify({
        source: 'api',
        user: {
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name,
          avatar: avatarUrl,
          avatar_decoration: avatarDecorationUrl,
        },
        presence: {
          status: 'offline',
          activities: [],
          spotify: null,
          listening_to_spotify: false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getActivityTypeNumber(typeString: string | null): number {
  const types: Record<string, number> = {
    'Playing': 0,
    'Streaming': 1,
    'Listening to': 2,
    'Watching': 3,
    'Competing in': 5,
  };
  return types[typeString || ''] || 0;
}
