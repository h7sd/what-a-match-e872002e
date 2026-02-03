import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Target channel for event announcements
const EVENT_CHANNEL_ID = '1468373160431845407'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')
    if (!botToken) {
      console.error('[EVENT] Discord bot token not configured')
      return new Response(
        JSON.stringify({ error: 'Bot not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Verify admin auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      console.log('[EVENT] Non-admin access attempt:', user.id.substring(0, 8) + '***')
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { event_name, event_type, description, duration_hours, action } = body

    // Build Discord embed based on action
    let embed: Record<string, unknown>
    let content: string

    if (action === 'start') {
      const eventTypeEmoji = event_type === 'steal' ? '🏴‍☠️' : '🔍'
      const eventTypeText = event_type === 'steal' ? 'Badge Steal Event' : 'Badge Hunt Event'
      
      embed = {
        title: `${eventTypeEmoji} ${event_name}`,
        description: description || (event_type === 'steal' 
          ? '**Ein Badge-Diebstahl Event hat begonnen!** Besuche Profile anderer User und stehle ihre Badges für eine begrenzte Zeit!'
          : '**Ein Badge-Jagd Event hat begonnen!** Finde das versteckte Badge bevor es jemand anderes tut!'),
        color: event_type === 'steal' ? 0xef4444 : 0x22c55e,
        fields: [
          {
            name: '⏰ Dauer',
            value: `${duration_hours} Stunden`,
            inline: true
          },
          {
            name: '🎯 Event-Typ',
            value: eventTypeText,
            inline: true
          },
          {
            name: '🔗 Teilnehmen',
            value: '[Jetzt auf UserVault](https://what-a-match.lovable.app)',
            inline: false
          }
        ],
        footer: {
          text: 'UserVault Badge Events'
        },
        timestamp: new Date().toISOString()
      }
      
      content = '@everyone 🎉 **NEUES EVENT GESTARTET!**'
    } else if (action === 'end') {
      embed = {
        title: `🏁 ${event_name} beendet`,
        description: 'Das Event ist nun vorbei. Alle gestohlenen Badges werden zurückgegeben.',
        color: 0x6b7280,
        footer: {
          text: 'UserVault Badge Events'
        },
        timestamp: new Date().toISOString()
      }
      
      content = '📢 **Event beendet**'
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send message via Discord Bot API
    const discordResponse = await fetch(`https://discord.com/api/v10/channels/${EVENT_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        embeds: [embed],
        allowed_mentions: {
          parse: ['everyone']
        }
      }),
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('[EVENT] Discord API error:', discordResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send Discord notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[EVENT] Notification sent successfully for:', event_name)

    return new Response(
      JSON.stringify({ success: true, message: 'Event notification sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[EVENT] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
