import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-encrypted, x-session-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Simple AES-GCM encryption using Web Crypto API
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
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
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

    // Get client IP (with fallbacks)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // Hash the IP for privacy
    const ipHash = await hashIP(clientIp, encryptionSecret);

    const body = await req.json();
    const { action, username, profile_id, is_like } = body;

    // Get user ID if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Helper to get profile by username
    async function getProfileByUsername(uname: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, likes_count, dislikes_count')
        .eq('username', uname.toLowerCase())
        .single();
      
      if (error || !data) {
        // Try alias
        const { data: aliasData, error: aliasError } = await supabase
          .from('profiles')
          .select('id, username, likes_count, dislikes_count')
          .eq('alias_username', uname.toLowerCase())
          .single();
        
        return aliasData;
      }
      return data;
    }

    if (action === 'vote') {
      // Get profile - support both username and profile_id for backwards compatibility
      let profile;
      if (username) {
        profile = await getProfileByUsername(username);
      } else if (profile_id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, likes_count, dislikes_count')
          .eq('id', profile_id)
          .single();
        profile = data;
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const targetProfileId = profile.id;

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('profile_likes')
        .select('id, is_like')
        .eq('profile_id', targetProfileId)
        .eq('liker_ip_hash', ipHash)
        .maybeSingle();

      // Encrypt metadata
      const encryptedData = await encrypt(JSON.stringify({
        timestamp: new Date().toISOString(),
        action: is_like ? 'like' : 'dislike',
        user_agent: req.headers.get('user-agent')?.substring(0, 100),
      }), encryptionSecret);

      if (existingVote) {
        if (existingVote.is_like === is_like) {
          // Same vote - remove it (toggle off)
          const { error: deleteError } = await supabase
            .from('profile_likes')
            .delete()
            .eq('id', existingVote.id);

          if (deleteError) throw deleteError;

          // Get updated counts
          const { data: counts } = await supabase
            .rpc('get_profile_like_counts', { p_profile_id: targetProfileId });

          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'removed',
              likes_count: counts?.[0]?.likes_count || 0,
              dislikes_count: counts?.[0]?.dislikes_count || 0,
              user_vote: null 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Different vote - update it
          const { error: updateError } = await supabase
            .from('profile_likes')
            .update({ 
              is_like, 
              encrypted_data: encryptedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVote.id);

          if (updateError) throw updateError;

          // Get updated counts
          const { data: counts } = await supabase
            .rpc('get_profile_like_counts', { p_profile_id: targetProfileId });

          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'changed',
              likes_count: counts?.[0]?.likes_count || 0,
              dislikes_count: counts?.[0]?.dislikes_count || 0,
              user_vote: is_like 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // New vote
        const { error: insertError } = await supabase
          .from('profile_likes')
          .insert({
            profile_id: targetProfileId,
            liker_ip_hash: ipHash,
            liker_user_id: userId,
            is_like,
            encrypted_data: encryptedData,
          });

        if (insertError) throw insertError;

        // Get updated counts
        const { data: counts } = await supabase
          .rpc('get_profile_like_counts', { p_profile_id: targetProfileId });

        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'added',
            likes_count: counts?.[0]?.likes_count || 0,
            dislikes_count: counts?.[0]?.dislikes_count || 0,
            user_vote: is_like 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'get_status') {
      // Get profile - support both username and profile_id
      let profile;
      if (username) {
        profile = await getProfileByUsername(username);
      } else if (profile_id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, likes_count, dislikes_count')
          .eq('id', profile_id)
          .single();
        profile = data;
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ 
            success: true,
            likes_count: 0,
            dislikes_count: 0,
            user_vote: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current vote status for this IP
      const { data: existingVote } = await supabase
        .from('profile_likes')
        .select('is_like')
        .eq('profile_id', profile.id)
        .eq('liker_ip_hash', ipHash)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          likes_count: profile.likes_count || 0,
          dislikes_count: profile.dislikes_count || 0,
          user_vote: existingVote ? existingVote.is_like : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Profile like error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});