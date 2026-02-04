import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Default Discord role IDs to mention (fallback if none provided)
const DEFAULT_ADMIN_ROLE_IDS = ['1464317378929233992', '1464309180252033273']

// AES-256-GCM encryption utilities
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('uservault-webhook-protection-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

async function decryptWebhookUrl(encryptedUrl: string, key: CryptoKey): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedUrl), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return new TextDecoder().decode(decrypted)
  } catch {
    // If decryption fails, assume it's a plain URL (for backwards compatibility)
    return encryptedUrl
  }
}

// Generate HMAC signature for request integrity
async function generateHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Mask sensitive data for logging
function maskUrl(url: string): string {
  if (!url) return '[REDACTED]'
  try {
    const parsed = new URL(url)
    const pathParts = parsed.pathname.split('/')
    if (pathParts.length > 2) {
      pathParts[pathParts.length - 1] = '***'
      pathParts[pathParts.length - 2] = '***'
    }
    return `${parsed.protocol}//${parsed.host}${pathParts.join('/')}`
  } catch {
    return '[REDACTED]'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body first to check for custom webhook
    const body = await req.json()
    const { version, changes, publishedAt, customWebhookUrl, notificationType, roleIds } = body
    
    // Determine which role IDs to use
    const rolesToMention: string[] = (roleIds && roleIds.length > 0) ? roleIds : DEFAULT_ADMIN_ROLE_IDS
    const isAnnouncement = notificationType === 'announce'

    // Determine which webhook URL to use
    let webhookUrl: string
    
    if (customWebhookUrl) {
      // Use custom webhook URL passed from client (stored in DB)
      webhookUrl = customWebhookUrl
      console.log('[SECURE] Using custom webhook from request')
    } else {
      // Get default webhook URL from secrets
      const webhookUrlRaw = Deno.env.get('DISCORD_PUBLISH_WEBHOOK_URL')
      if (!webhookUrlRaw) {
        console.error('[SECURITY] Webhook configuration missing')
        return new Response(
          JSON.stringify({ error: 'Webhook not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Derive encryption key from service role key (never exposed)
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const encryptionKey = await deriveKey(serviceKey)
      
      // Decrypt webhook URL if encrypted, or use as-is for backwards compatibility
      if (webhookUrlRaw.startsWith('http')) {
        webhookUrl = webhookUrlRaw
      } else {
        webhookUrl = await decryptWebhookUrl(webhookUrlRaw, encryptionKey)
      }
      console.log('[SECURE] Using default webhook from env')
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

    // Verify user is admin
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      console.log('[SECURITY] Non-admin access attempt:', user.id.substring(0, 8) + '***')
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get publisher's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name')
      .eq('user_id', user.id)
      .single()

    const publisherName = profile?.display_name || profile?.username || 'Unknown Admin'
    const timestamp = new Date(publishedAt || Date.now()).toISOString()

    // Create role mentions
    const roleMentions = rolesToMention.map(id => `<@&${id}>`).join(' ')

    // Create Discord embed based on notification type
    const embed = {
      title: isAnnouncement ? '📢 New Announcement' : '🚀 Website Update Published',
      color: isAnnouncement ? 0x10b981 : 0x7c3aed, // Emerald for announcements, Purple for changelog
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
        text: isAnnouncement ? 'UserVault Announcement' : 'UserVault Update System'
      },
      timestamp: timestamp
    }

    // Add changes field if provided
    if (changes && changes.length > 0) {
      const changesText = Array.isArray(changes) 
        ? changes.map((c: string) => `• ${c}`).join('\n')
        : changes
      
      embed.fields.push({
        name: isAnnouncement ? '📝 Details' : '📝 Changes',
        value: changesText.substring(0, 1024),
        inline: false
      })
    }

    // Add link to the website
    // Use the vanity domain to avoid Discord showing the Lovable app domain.
    embed.fields.push({
      name: '🔗 Website',
      value: '[View Live Site](https://uservault.cc)',
      inline: false
    })

    // Prepare payload with dynamic content based on type
    // For announcements: only @everyone, no role tags
    // For changelog: role tags only
    const contentMessage = isAnnouncement 
      ? `@everyone **New Announcement!**`
      : `${roleMentions} **Website Update Published!**`
    
    const payload = {
      content: contentMessage,
      embeds: [embed],
      allowed_mentions: isAnnouncement 
        ? { everyone: true }
        : { roles: rolesToMention }
    }

    // Generate HMAC for payload integrity
    const payloadString = JSON.stringify(payload)
    const hmacSignature = await generateHmac(payloadString, serviceKey)

    // Log with masked URL for security
    console.log('[SECURE] Sending notification to:', maskUrl(webhookUrl))
    console.log('[SECURE] Payload HMAC:', hmacSignature.substring(0, 16) + '...')

    // Send to Discord via secure channel
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': hmacSignature,
        'X-Timestamp': Date.now().toString()
      },
      body: payloadString,
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('[SECURE] Webhook delivery failed:', discordResponse.status)
      // Don't log the actual error as it might contain sensitive info
      return new Response(
        JSON.stringify({ error: 'Failed to send notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log success without exposing sensitive data
    console.log('[SECURE] Notification delivered successfully')
    console.log('[AUDIT] Publisher:', user.id.substring(0, 8) + '***', 'at', timestamp)

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent securely' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SECURE] Processing error (details redacted)')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
