import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bot-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, discord_user_id, presence_data } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For UPDATE action, verify bot token (only bot can update)
    if (action === 'update') {
      const botToken = req.headers.get('x-bot-token');
      const expectedToken = Deno.env.get('DISCORD_BOT_TOKEN');
      
      if (!botToken || botToken !== expectedToken) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }


    // GET PRESENCE - for frontend
    if (action === 'get' || !action) {
      if (!discord_user_id) {
        return new Response(
          JSON.stringify({ error: 'discord_user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for presence data in database
      const { data: presenceData, error: presenceError } = await supabase
        .from('discord_presence')
        .select('*')
        .eq('discord_user_id', discord_user_id)
        .maybeSingle();

      if (presenceData) {
        console.log('Returning bot presence data for:', presenceData.username);
        
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
      const discordBotToken = Deno.env.get('DISCORD_BOT_TOKEN');
      if (!discordBotToken) {
        return new Response(
          JSON.stringify({ error: 'Bot not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userResponse = await fetch(`https://discord.com/api/v10/users/${discord_user_id}`, {
        headers: { 'Authorization': `Bot ${discordBotToken}` },
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
    }

    // UPDATE PRESENCE - from bot
    if (action === 'update') {
      if (!discord_user_id || !presence_data) {
        return new Response(
          JSON.stringify({ error: 'discord_user_id and presence_data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('discord_user_id', discord_user_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ skipped: true, reason: 'No profile found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert presence
      const { error: upsertError } = await supabase
        .from('discord_presence')
        .upsert({
          profile_id: profile.id,
          discord_user_id: discord_user_id,
          username: presence_data.username,
          avatar: presence_data.avatar,
          status: presence_data.status,
          activity_name: presence_data.activity_name,
          activity_type: presence_data.activity_type,
          activity_details: presence_data.activity_details,
          activity_state: presence_data.activity_state,
          activity_large_image: presence_data.activity_large_image,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'profile_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to update presence' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Updated presence for:', presence_data.username, '-', presence_data.status);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
