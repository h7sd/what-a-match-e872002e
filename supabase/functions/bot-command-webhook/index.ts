import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * This function processes pending bot_command_notifications and sends them to Discord.
 * It can be called:
 * 1. Manually via GET request to process all pending notifications
 * 2. By the Python bot after polling notifications
 * 3. Via a scheduled cron job
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  try {
    // Get webhook URL from admin_webhooks
    const { data: webhookData } = await supabaseAdmin
      .from('admin_webhooks')
      .select('webhook_url')
      .eq('notification_type', 'bot_commands')
      .maybeSingle()

    if (!webhookData?.webhook_url) {
      return new Response(JSON.stringify({ 
        error: 'No bot_commands webhook configured',
        hint: 'Add a webhook with notification_type = "bot_commands" to admin_webhooks table'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get unprocessed notifications (those not yet sent to Discord)
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from('bot_command_notifications')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('[bot-command-webhook] Fetch error:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No pending notifications',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const colors: Record<string, number> = {
      created: 0x22c55e, // green
      updated: 0xf59e0b, // amber  
      deleted: 0xef4444, // red
    }

    const emojis: Record<string, string> = {
      created: '✅',
      updated: '🔄',
      deleted: '🗑️',
    }

    const processedIds: string[] = []
    const errors: string[] = []

    // Process each notification
    for (const notification of notifications) {
      const { id, action, command_name, changes } = notification

      const fields = []
      if (changes && typeof changes === 'object') {
        for (const [key, value] of Object.entries(changes as Record<string, unknown>)) {
          if (value !== null && value !== undefined) {
            fields.push({
              name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
              value: String(value).substring(0, 1024),
              inline: true,
            })
          }
        }
      }

      const embed = {
        title: `${emojis[action] || '📢'} Command ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `**\`?${command_name}\`**`,
        color: colors[action] || 0x6366f1,
        fields: fields.length > 0 ? fields : undefined,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'UserVault Bot Commands',
        },
      }

      try {
        const response = await fetch(webhookData.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })

        if (response.ok) {
          processedIds.push(id)
          console.log(`[bot-command-webhook] Sent: ${action} ${command_name}`)
        } else {
          const errorText = await response.text()
          errors.push(`${command_name}: ${response.status} - ${errorText}`)
          console.error(`[bot-command-webhook] Failed for ${command_name}:`, response.status, errorText)
        }

        // Rate limit: wait 500ms between webhooks
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        errors.push(`${command_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        console.error(`[bot-command-webhook] Error for ${command_name}:`, err)
      }
    }

    // Mark processed notifications
    if (processedIds.length > 0) {
      await supabaseAdmin
        .from('bot_command_notifications')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', processedIds)
    }

    return new Response(JSON.stringify({
      message: `Processed ${processedIds.length} notifications`,
      processed: processedIds.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[bot-command-webhook] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
