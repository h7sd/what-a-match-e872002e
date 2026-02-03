import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// INPUT VALIDATION HELPERS
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function sanitizeString(value: unknown, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  // Trim and limit length
  return value.trim().slice(0, maxLength);
}

function sanitizeBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function sanitizeNumber(value: unknown, min?: number, max?: number): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return null;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

// Allowed fields for profile updates (whitelist approach)
const ALLOWED_PROFILE_FIELDS = new Set([
  'display_name', 'bio', 'avatar_url', 'background_url', 'background_color',
  'accent_color', 'card_color', 'music_url', 'background_video_url', 'avatar_shape',
  'name_font', 'text_font', 'occupation', 'location', 'discord_user_id', 'layout_style',
  'card_style', 'text_color', 'icon_color', 'custom_cursor_url', 'og_title', 'og_description',
  'og_image_url', 'og_icon_url', 'og_title_animation', 'background_effect', 'discord_card_style',
  'discord_badge_color', 'discord_card_opacity', 'discord_show_badge', 'discord_avatar_decoration',
  'use_discord_avatar', 'start_screen_enabled', 'start_screen_text', 'start_screen_font',
  'start_screen_color', 'start_screen_bg_color', 'start_screen_animation', 'show_volume_control',
  'show_username', 'show_badges', 'show_views', 'show_avatar', 'show_links', 'show_description',
  'show_display_name', 'card_border_enabled', 'card_border_width', 'card_border_color',
  'audio_volume', 'profile_opacity', 'profile_blur', 'monochrome_icons', 'animated_title',
  'swap_bio_colors', 'glow_username', 'glow_socials', 'glow_badges', 'enable_profile_gradient',
  'icon_only_links', 'icon_links_opacity', 'transparent_badges', 'ascii_size', 'ascii_waves',
  'is_premium', 'uid_number', 'alias_username', 'effects_config', 'username'
]);

// Sensitive fields that require extra validation
const SENSITIVE_FIELDS = new Set(['is_premium', 'uid_number', 'alias_username', 'username']);

// Username validation regex (1-20 chars, lowercase letters, numbers, underscores)
const USERNAME_REGEX = /^[a-z0-9_]{1,20}$/;

function validateAndSanitizeProfileData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Only allow whitelisted fields
    if (!ALLOWED_PROFILE_FIELDS.has(key)) {
      console.warn(`Blocked unauthorized field: ${key}`);
      continue;
    }
    
    // Sanitize based on field type
    if (key.startsWith('show_') || key.endsWith('_enabled') || 
        ['is_premium', 'monochrome_icons', 'animated_title', 'swap_bio_colors',
         'glow_username', 'glow_socials', 'glow_badges', 'enable_profile_gradient',
         'icon_only_links', 'transparent_badges', 'ascii_waves', 'use_discord_avatar',
         'discord_show_badge', 'discord_avatar_decoration'].includes(key)) {
      const boolVal = sanitizeBoolean(value);
      if (boolVal !== null) sanitized[key] = boolVal;
    } else if (['uid_number', 'discord_card_opacity', 'card_border_width', 
                'profile_opacity', 'profile_blur', 'icon_links_opacity', 'ascii_size'].includes(key)) {
      const numVal = sanitizeNumber(value, 0, 10000);
      if (numVal !== null) sanitized[key] = numVal;
    } else if (key === 'audio_volume') {
      const numVal = sanitizeNumber(value, 0, 1);
      if (numVal !== null) sanitized[key] = numVal;
    } else if (key === 'effects_config') {
      // JSON field - validate it's an object
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = value;
      }
    } else if (key === 'username' || key === 'alias_username') {
      // Special validation for username/alias - must match format
      // Allow null for alias_username (to remove it)
      if (key === 'alias_username' && (value === null || value === '')) {
        sanitized[key] = null;
      } else {
        const strVal = sanitizeString(value, 20);
        if (strVal && USERNAME_REGEX.test(strVal.toLowerCase())) {
          sanitized[key] = strVal.toLowerCase();
        } else {
          console.warn(`Invalid ${key} format blocked:`, strVal);
        }
      }
    } else {
      // String fields
      const strVal = sanitizeString(value, 2000);
      if (strVal !== null) sanitized[key] = strVal;
    }
  }
  
  return sanitized;
}

// Allowed fields for badge updates
const ALLOWED_BADGE_FIELDS = new Set(['is_enabled', 'is_locked']);

function validateAndSanitizeBadgeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_BADGE_FIELDS.has(key)) {
      console.warn(`Blocked unauthorized badge field: ${key}`);
      continue;
    }
    const boolVal = sanitizeBoolean(value);
    if (boolVal !== null) sanitized[key] = boolVal;
  }
  
  return sanitized;
}

// Allowed fields for social link updates
const ALLOWED_LINK_FIELDS = new Set([
  'platform', 'url', 'title', 'icon', 'description', 'style', 'is_visible', 'display_order'
]);

function validateAndSanitizeLinkData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_LINK_FIELDS.has(key)) {
      console.warn(`Blocked unauthorized link field: ${key}`);
      continue;
    }
    
    if (key === 'is_visible') {
      const boolVal = sanitizeBoolean(value);
      if (boolVal !== null) sanitized[key] = boolVal;
    } else if (key === 'display_order') {
      const numVal = sanitizeNumber(value, 0, 1000);
      if (numVal !== null) sanitized[key] = numVal;
    } else if (key === 'url') {
      // Validate URL format
      const strVal = sanitizeString(value, 2000);
      if (strVal) {
        try {
          new URL(strVal);
          sanitized[key] = strVal;
        } catch {
          console.warn('Invalid URL blocked:', strVal);
        }
      }
    } else {
      const strVal = sanitizeString(value, 500);
      if (strVal !== null) sanitized[key] = strVal;
    }
  }
  
  return sanitized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get and verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse and validate request body
    let body: { action?: string; profileId?: string; data?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, profileId, data } = body;

    // Validate action
    const ALLOWED_ACTIONS = ['update_profile', 'update_badge', 'update_social_link', 'delete_social_link', 'add_social_link'];
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_profile') {
      // Validate profileId
      if (!isValidUUID(profileId)) {
        return new Response(JSON.stringify({ error: 'Invalid profile ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!data || typeof data !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Sanitize and validate all fields
      const sanitizedData = validateAndSanitizeProfileData(data);
      
      if (Object.keys(sanitizedData).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // If username is being changed, check for uniqueness
      if (sanitizedData.username) {
        const newUsername = sanitizedData.username as string;
        
        // Check if username is already taken (by another profile or as an alias)
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .or(`username.eq.${newUsername},alias_username.eq.${newUsername}`)
          .neq('id', profileId)
          .maybeSingle();
        
        if (existingProfile) {
          return new Response(JSON.stringify({ error: 'Username is already taken' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(sanitizedData)
        .eq('id', profileId)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_badge') {
      if (!data || typeof data !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { badgeId, updates } = data as { badgeId?: string; updates?: Record<string, unknown> };
      
      if (!isValidUUID(badgeId)) {
        return new Response(JSON.stringify({ error: 'Invalid badge ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!updates || typeof updates !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid updates' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const sanitizedUpdates = validateAndSanitizeBadgeData(updates);
      
      if (Object.keys(sanitizedUpdates).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('user_badges')
        .update(sanitizedUpdates)
        .eq('id', badgeId)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_social_link') {
      if (!data || typeof data !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { linkId, updates } = data as { linkId?: string; updates?: Record<string, unknown> };
      
      if (!isValidUUID(linkId)) {
        return new Response(JSON.stringify({ error: 'Invalid link ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!updates || typeof updates !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid updates' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const sanitizedUpdates = validateAndSanitizeLinkData(updates);
      
      if (Object.keys(sanitizedUpdates).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('social_links')
        .update(sanitizedUpdates)
        .eq('id', linkId)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete_social_link') {
      if (!data || typeof data !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { linkId } = data as { linkId?: string };
      
      if (!isValidUUID(linkId)) {
        return new Response(JSON.stringify({ error: 'Invalid link ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('social_links')
        .delete()
        .eq('id', linkId)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'add_social_link') {
      if (!data || typeof data !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate profile_id is present
      const { profile_id, ...linkData } = data as { profile_id?: string } & Record<string, unknown>;
      
      if (!isValidUUID(profile_id)) {
        return new Response(JSON.stringify({ error: 'Invalid profile ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const sanitizedData = validateAndSanitizeLinkData(linkData);
      
      // URL and platform are required
      if (!sanitizedData.url || !sanitizedData.platform) {
        return new Response(JSON.stringify({ error: 'URL and platform are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabaseAdmin
        .from('social_links')
        .insert({ ...sanitizedData, profile_id })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Admin update error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})