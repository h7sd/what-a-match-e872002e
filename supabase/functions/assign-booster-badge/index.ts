import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp',
}

// HMAC verification
function verifySignature(payload: string, signature: string, timestamp: string): boolean {
  const secret = Deno.env.get('DISCORD_WEBHOOK_SECRET')
  if (!secret) return false
  
  const now = Math.floor(Date.now() / 1000)
  const requestTime = parseInt(timestamp, 10)
  
  if (Math.abs(now - requestTime) > 300) {
    return false
  }
  
  const message = `${timestamp}.${payload}`
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')
  
  return expectedSig === signature
}

// Server Booster badge ID - will be created if doesn't exist
const BOOSTER_BADGE_NAME = 'Server Booster'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('x-signature') || ''
    const timestamp = req.headers.get('x-timestamp') || ''
    
    if (!verifySignature(body, signature, timestamp)) {
      console.error('Invalid signature')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, discordUserId } = JSON.parse(body)
    
    console.log('Booster badge action:', action, 'discordUserId:', discordUserId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find user by Discord ID
    const { data: presence } = await supabase
      .from('discord_presence')
      .select('profile_id')
      .eq('discord_user_id', discordUserId)
      .maybeSingle()

    if (!presence?.profile_id) {
      console.log('No profile found for Discord user:', discordUserId)
      return new Response(
        JSON.stringify({ success: false, error: 'No linked UserVault account found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', presence.profile_id)
      .single()

    if (!profile?.user_id) {
      console.log('No user_id found for profile:', presence.profile_id)
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find or create the Server Booster badge
    let { data: boosterBadge } = await supabase
      .from('global_badges')
      .select('id')
      .ilike('name', BOOSTER_BADGE_NAME)
      .maybeSingle()

    if (!boosterBadge) {
      // Create the badge if it doesn't exist
      const { data: newBadge, error: createError } = await supabase
        .from('global_badges')
        .insert({
          name: BOOSTER_BADGE_NAME,
          description: 'Discord Server Booster',
          color: '#f47fff',
          icon_url: null,
          rarity: 'rare',
          is_limited: false,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Failed to create booster badge:', createError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create badge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      boosterBadge = newBadge
      console.log('Created Server Booster badge:', boosterBadge.id)
    }

    if (action === 'add_badge' || action === 'boost_start') {
      // Check if user already has the badge
      const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('badge_id', boosterBadge.id)
        .maybeSingle()

      if (existingBadge) {
        console.log('User already has booster badge')
        return new Response(
          JSON.stringify({ success: true, message: 'Badge already assigned' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Assign the badge
      const { error: assignError } = await supabase
        .from('user_badges')
        .insert({
          user_id: profile.user_id,
          badge_id: boosterBadge.id,
        })

      if (assignError) {
        console.error('Failed to assign booster badge:', assignError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to assign badge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Booster badge assigned to user:', profile.user_id)
      return new Response(
        JSON.stringify({ success: true, message: 'Booster badge assigned' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'remove_badge' || action === 'boost_end') {
      // Remove the badge
      const { error: removeError } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', profile.user_id)
        .eq('badge_id', boosterBadge.id)

      if (removeError) {
        console.error('Failed to remove booster badge:', removeError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to remove badge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Booster badge removed from user:', profile.user_id)
      return new Response(
        JSON.stringify({ success: true, message: 'Booster badge removed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
