import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-encrypted, x-session-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// AES-GCM encryption using Web Crypto API
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string, secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string, secret: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);
  const key = await deriveKey(secret, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// Hash IP address for privacy
async function hashIP(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET');

    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';
    const ipHash = await hashIP(clientIp, encryptionSecret);

    const body = await req.json();
    const { action, profile_id, username, content } = body;

    // Get user ID if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (action === 'add_comment') {
      // Validate content
      if (!content || typeof content !== 'string' || content.length < 1 || content.length > 280) {
        return new Response(
          JSON.stringify({ error: 'Comment must be 1-280 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get profile by username or ID
      let profileQuery = supabase.from('profiles').select('id, username');
      if (username) {
        profileQuery = profileQuery.eq('username', username.toLowerCase());
      } else if (profile_id) {
        profileQuery = profileQuery.eq('id', profile_id);
      } else {
        return new Response(
          JSON.stringify({ error: 'Profile identifier required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: profile, error: profileError } = await profileQuery.single();
      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limit: max 3 comments per IP per profile per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from('profile_comments')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .eq('commenter_ip_hash', ipHash)
        .gte('created_at', oneHourAgo);

      if ((recentCount || 0) >= 3) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Encrypt the comment content
      const encryptedContent = await encrypt(content, encryptionSecret);
      
      // Encrypt metadata
      const encryptedMetadata = await encrypt(JSON.stringify({
        timestamp: new Date().toISOString(),
        user_agent: req.headers.get('user-agent')?.substring(0, 100),
      }), encryptionSecret);

      // Calculate expiry (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Insert comment
      const { error: insertError } = await supabase
        .from('profile_comments')
        .insert({
          profile_id: profile.id,
          commenter_ip_hash: ipHash,
          commenter_user_id: userId,
          encrypted_content: encryptedContent,
          encrypted_metadata: encryptedMetadata,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      console.log(`Comment added to profile ${profile.username} by IP hash ${ipHash.substring(0, 8)}...`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Comment added successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_my_comments') {
      // Only for profile owner - get their comments
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!userProfile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get comments for this profile
      const { data: comments, error: commentsError } = await supabase
        .from('profile_comments')
        .select('id, encrypted_content, created_at, expires_at, is_read')
        .eq('profile_id', userProfile.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentsError) throw commentsError;

      // Decrypt comments
      const decryptedComments = await Promise.all(
        (comments || []).map(async (comment) => {
          try {
            const decryptedContent = await decrypt(comment.encrypted_content, encryptionSecret);
            return {
              id: comment.id,
              content: decryptedContent,
              created_at: comment.created_at,
              expires_at: comment.expires_at,
              is_read: comment.is_read,
            };
          } catch (e) {
            console.error('Failed to decrypt comment:', e);
            return null;
          }
        })
      );

      return new Response(
        JSON.stringify({ 
          success: true,
          comments: decryptedComments.filter(Boolean)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'mark_read') {
      const { comment_id } = body;
      
      if (!userId || !comment_id) {
        return new Response(
          JSON.stringify({ error: 'Authentication and comment ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!userProfile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update comment
      const { error: updateError } = await supabase
        .from('profile_comments')
        .update({ is_read: true })
        .eq('id', comment_id)
        .eq('profile_id', userProfile.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_count') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!userProfile) {
        return new Response(
          JSON.stringify({ count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { count } = await supabase
        .from('profile_comments')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userProfile.id)
        .eq('is_read', false)
        .gt('expires_at', new Date().toISOString());

      return new Response(
        JSON.stringify({ count: count || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Profile comment error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
