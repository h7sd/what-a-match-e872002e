import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Discord role IDs to mention
const ADMIN_ROLE_IDS = ['1464317378929233992', '1464309180252033273']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookUrl = Deno.env.get('DISCORD_PUBLISH_WEBHOOK_URL')
    if (!webhookUrl) {
      console.error('DISCORD_PUBLISH_WEBHOOK_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user is admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const body = await req.json()
    const { version, changes, publishedAt } = body

    // Get publisher's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name')
      .eq('user_id', user.id)
      .single()

    const publisherName = profile?.display_name || profile?.username || 'Unknown Admin'
    const timestamp = new Date(publishedAt || Date.now()).toISOString()

    // Create role mentions
    const roleMentions = ADMIN_ROLE_IDS.map(id => `<@&${id}>`).join(' ')

    // Create Discord embed
    const embed = {
      title: '🚀 Website Update Published',
      color: 0x7c3aed, // Purple color matching the brand
      fields: [
        {
          name: '👤 Publisher',
          value: publisherName,
          inline: true
        },
        {
          name: '📅 Timestamp',
          value: `<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:F>`,
          inline: true
        },
        {
          name: '🔢 Version',
          value: version || 'N/A',
          inline: true
        }
      ],
      footer: {
        text: 'UserVault Update System'
      },
      timestamp: timestamp
    }

    // Add changes field if provided
    if (changes && changes.length > 0) {
      const changesText = Array.isArray(changes) 
        ? changes.map((c: string) => `• ${c}`).join('\n')
        : changes
      
      embed.fields.push({
        name: '📝 Changes',
        value: changesText.substring(0, 1024), // Discord field limit
        inline: false
      })
    }

    // Add link to the website
    embed.fields.push({
      name: '🔗 Website',
      value: '[View Live Site](https://what-a-match.lovable.app)',
      inline: false
    })

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `${roleMentions} **Neue Website-Aktualisierung!**`,
        embeds: [embed],
        allowed_mentions: {
          roles: ADMIN_ROLE_IDS
        }
      }),
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('Discord webhook error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send Discord notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Publish notification sent successfully by:', publisherName)

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending publish notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
