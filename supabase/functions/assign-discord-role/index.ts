import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp',
}

// HMAC verification for bot requests
async function verifySignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
  const secret = Deno.env.get('DISCORD_WEBHOOK_SECRET')
  if (!secret) return false
  
  const now = Math.floor(Date.now() / 1000)
  const requestTime = parseInt(timestamp, 10)
  
  // Reject if timestamp is more than 5 minutes old
  if (Math.abs(now - requestTime) > 300) {
    console.error('Timestamp too old or in future')
    return false
  }
  
  const message = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  const data = encoder.encode(message)
  
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const hexSig = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return hexSig === signature
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('x-signature') || ''
    const timestamp = req.headers.get('x-timestamp') || ''
    
    // Verify HMAC signature for bot requests
    const isValidSignature = await verifySignature(body, signature, timestamp)
    
    // Also allow service role requests (from verify-paypal-payment)
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`
    
    if (!isValidSignature && !isServiceRole) {
      console.error('Invalid signature or unauthorized')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, userId, discordUserId, roleId, guildId } = JSON.parse(body)
    
    console.log('Discord role action:', action, 'userId:', userId, 'discordUserId:', discordUserId)

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not set')
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const GUILD_ID = guildId || '1206691043857334343' // Default guild ID
    const PREMIUM_ROLE_ID = roleId || '1467554630404804891' // Default premium role

    // If we have userId but not discordUserId, look it up
    let targetDiscordId = discordUserId
    
    if (!targetDiscordId && userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Check discord_presence table for user's Discord ID
      const { data: presence } = await supabase
        .from('discord_presence')
        .select('discord_user_id')
        .eq('profile_id', userId)
        .maybeSingle()
      
      if (presence?.discord_user_id) {
        targetDiscordId = presence.discord_user_id
      } else {
        // Try profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('discord_user_id')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (profile?.discord_user_id) {
          targetDiscordId = profile.discord_user_id
        }
      }
    }

    if (!targetDiscordId) {
      console.log('No Discord ID found for user:', userId)
      return new Response(
        JSON.stringify({ success: false, error: 'No Discord account linked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_role' || action === 'add_premium_role') {
      // Add role to user via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${targetDiscordId}/roles/${PREMIUM_ROLE_ID}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok || response.status === 204) {
        console.log('Successfully added premium role to Discord user:', targetDiscordId)
        return new Response(
          JSON.stringify({ success: true, message: 'Role added successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const errorText = await response.text()
        console.error('Failed to add role:', response.status, errorText)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to add role', details: errorText }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'remove_role') {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${targetDiscordId}/roles/${PREMIUM_ROLE_ID}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok || response.status === 204) {
        console.log('Successfully removed role from Discord user:', targetDiscordId)
        return new Response(
          JSON.stringify({ success: true, message: 'Role removed successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const errorText = await response.text()
        console.error('Failed to remove role:', response.status, errorText)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to remove role' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
