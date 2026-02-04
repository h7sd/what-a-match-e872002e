import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
}

// Verify HMAC signature
function verifySignature(payload: string, signature: string, timestamp: string, secret: string): boolean {
  const message = `${timestamp}.${payload}`
  const expectedSignature = createHmac('sha256', secret).update(message).digest('hex')
  return signature === expectedSignature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const webhookSecret = Deno.env.get('DISCORD_WEBHOOK_SECRET')

  if (!webhookSecret) {
    console.error('[bot-command-notifications] DISCORD_WEBHOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature')
    const timestamp = req.headers.get('x-webhook-timestamp')
    const bodyText = await req.text()

    if (!signature || !timestamp) {
      return new Response(JSON.stringify({ error: 'Missing signature headers' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check timestamp is within 5 minutes
    const timestampMs = parseInt(timestamp)
    const now = Date.now()
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'Request expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!verifySignature(bodyText, signature, timestamp, webhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = JSON.parse(bodyText)
    const { action } = body

    // ========== GET PENDING NOTIFICATIONS ==========
    if (action === 'get_pending') {
      const { data: notifications, error } = await supabaseAdmin
        .from('bot_command_notifications')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) {
        console.error('[bot-command-notifications] GET error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`[bot-command-notifications] Returning ${notifications?.length || 0} pending notifications`)
      return new Response(JSON.stringify({ notifications }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ========== MARK NOTIFICATION AS PROCESSED ==========
    if (action === 'mark_processed') {
      const { notificationId } = body

      if (!notificationId) {
        return new Response(JSON.stringify({ error: 'notificationId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('bot_command_notifications')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('[bot-command-notifications] UPDATE error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`[bot-command-notifications] Marked ${notificationId} as processed`)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[bot-command-notifications] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
