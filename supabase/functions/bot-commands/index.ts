import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
}

// Discord webhook URL for command update notifications (stored in admin_webhooks table)

interface CommandPayload {
  name: string
  description?: string
  usage?: string
  category?: string
  is_enabled?: boolean
  cooldown_seconds?: number
  required_role?: string
}

// Send Discord webhook notification
async function sendDiscordNotification(
  supabaseAdmin: any,
  action: 'created' | 'updated' | 'deleted',
  commandName: string,
  author?: string,
  changes?: Record<string, unknown>
) {
  // Get webhook URL from admin_webhooks table
  const { data: webhook } = await supabaseAdmin
    .from('admin_webhooks')
    .select('webhook_url')
    .eq('notification_type', 'command_updates')
    .limit(1)
    .maybeSingle()

  const webhookUrl = webhook?.webhook_url as string | undefined
  if (!webhookUrl) {
    console.warn('[bot-commands] No command_updates webhook configured, skipping notification')
    return
  }

  const colors = {
    created: 0x22c55e, // green
    updated: 0xf59e0b, // amber
    deleted: 0xef4444, // red
  }

  const emojis = {
    created: '✨',
    updated: '📝',
    deleted: '🗑️',
  }

  const embed: Record<string, unknown> = {
    title: `${emojis[action]} Command ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    description: `**\`/${commandName}\`** was ${action}`,
    color: colors[action],
    fields: [
      {
        name: '⏰ Timestamp',
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true,
      },
    ],
    footer: {
      text: 'UserVault Command System',
    },
    timestamp: new Date().toISOString(),
  }

  if (author) {
    embed.fields = [
      ...(embed.fields as Array<Record<string, unknown>>),
      {
        name: '👤 Author',
        value: author,
        inline: true,
      },
    ]
  }

  if (changes && Object.keys(changes).length > 0) {
    const changesText = Object.entries(changes)
      .map(([key, value]) => `• **${key}**: ${value}`)
      .join('\n')
    embed.fields = [
      ...(embed.fields as Array<Record<string, unknown>>),
      {
        name: '📋 Changes',
        value: changesText.slice(0, 1024),
        inline: false,
      },
    ]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[bot-commands] Discord webhook failed:', response.status, errorText)
    } else {
      console.log(`[bot-commands] Discord notification sent: ${action} ${commandName}`)
    }
  } catch (error) {
    console.error('[bot-commands] Failed to send Discord notification:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  try {
    const url = new URL(req.url)
    const commandId = url.searchParams.get('id')

    // ========== GET: List all commands ==========
    if (req.method === 'GET') {
      const { data: commands, error } = await supabaseAdmin
        .from('bot_commands')
        .select('*')
        .order('category')
        .order('name')

      if (error) {
        console.error('[bot-commands] GET error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`[bot-commands] GET: returning ${commands?.length || 0} commands`)
      return new Response(JSON.stringify({ commands }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ========== Auth required for write operations ==========
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      console.log('[bot-commands] Non-admin access attempt:', user.id.substring(0, 8) + '***')
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authorEmail = user.email || 'Unknown'

    // ========== POST: Create command ==========
    if (req.method === 'POST') {
      const body: CommandPayload = await req.json()

      if (!body.name || body.name.trim() === '') {
        return new Response(JSON.stringify({ error: 'Command name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: newCommand, error } = await supabaseAdmin
        .from('bot_commands')
        .insert({
          name: body.name.toLowerCase().trim(),
          description: body.description,
          usage: body.usage,
          category: body.category || 'general',
          is_enabled: body.is_enabled ?? true,
          cooldown_seconds: body.cooldown_seconds || 0,
          required_role: body.required_role,
          created_by: authorEmail,
        })
        .select()
        .single()

      if (error) {
        console.error('[bot-commands] POST error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Send Discord notification
      await sendDiscordNotification(supabaseAdmin, 'created', body.name, authorEmail, {
        description: body.description || 'None',
        category: body.category || 'general',
      })

      console.log(`[bot-commands] Created: ${body.name} by ${authorEmail}`)
      return new Response(JSON.stringify({ command: newCommand }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ========== PATCH: Update command ==========
    if (req.method === 'PATCH') {
      if (!commandId) {
        return new Response(JSON.stringify({ error: 'Command ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const body: Partial<CommandPayload> = await req.json()

      // Get current command for comparison
      const { data: currentCommand } = await supabaseAdmin
        .from('bot_commands')
        .select('*')
        .eq('id', commandId)
        .single()

      if (!currentCommand) {
        return new Response(JSON.stringify({ error: 'Command not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name.toLowerCase().trim()
      if (body.description !== undefined) updates.description = body.description
      if (body.usage !== undefined) updates.usage = body.usage
      if (body.category !== undefined) updates.category = body.category
      if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled
      if (body.cooldown_seconds !== undefined) updates.cooldown_seconds = body.cooldown_seconds
      if (body.required_role !== undefined) updates.required_role = body.required_role

      const { data: updatedCommand, error } = await supabaseAdmin
        .from('bot_commands')
        .update(updates)
        .eq('id', commandId)
        .select()
        .single()

      if (error) {
        console.error('[bot-commands] PATCH error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Calculate what changed for notification
      const changes: Record<string, string> = {}
      for (const key of Object.keys(updates)) {
        if (currentCommand[key] !== updates[key]) {
          changes[key] = `${currentCommand[key]} → ${updates[key]}`
        }
      }

      await sendDiscordNotification(supabaseAdmin, 'updated', currentCommand.name, authorEmail, changes)

      console.log(`[bot-commands] Updated: ${currentCommand.name} by ${authorEmail}`)
      return new Response(JSON.stringify({ command: updatedCommand }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ========== DELETE: Remove command ==========
    if (req.method === 'DELETE') {
      if (!commandId) {
        return new Response(JSON.stringify({ error: 'Command ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get command name before deletion
      const { data: command } = await supabaseAdmin
        .from('bot_commands')
        .select('name')
        .eq('id', commandId)
        .single()

      if (!command) {
        return new Response(JSON.stringify({ error: 'Command not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('bot_commands')
        .delete()
        .eq('id', commandId)

      if (error) {
        console.error('[bot-commands] DELETE error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await sendDiscordNotification(supabaseAdmin, 'deleted', command.name, authorEmail)

      console.log(`[bot-commands] Deleted: ${command.name} by ${authorEmail}`)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[bot-commands] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
