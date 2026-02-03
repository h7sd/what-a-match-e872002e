import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-encrypted',
}

// Server-side encryption key (must match get-encryption-key derivation)
const ENCRYPTION_SECRET = Deno.env.get('ENCRYPTION_SECRET') || 'uservault-default-secret-change-in-prod';

// Derive key for a user
async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(`${ENCRYPTION_SECRET}:${userId}:api-encryption`);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = encoder.encode('uservault-api-encryption-v1');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 50000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Decrypt incoming payload
async function decryptPayload(encrypted: string, iv: string, key: CryptoKey): Promise<unknown> {
  const decoder = new TextDecoder();
  
  const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encryptedData
  );
  
  return JSON.parse(decoder.decode(decryptedBuffer));
}

// Encrypt outgoing response
async function encryptResponse(data: unknown, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(data));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if request is encrypted
    const isEncrypted = req.headers.get('x-encrypted') === 'true';
    const userKey = await deriveUserKey(user.id);

    let requestBody: { action: string; data?: unknown };

    if (isEncrypted) {
      // Decrypt request body
      const { encrypted, iv } = await req.json();
      requestBody = await decryptPayload(encrypted, iv, userKey) as { action: string; data?: unknown };
    } else {
      requestBody = await req.json();
    }

    const { action, data } = requestBody;

    // Handle different actions
    let responseData: unknown;

    switch (action) {
      case 'get-profile': {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        responseData = { profile };
        break;
      }

      case 'update-profile': {
        const updates = data as Record<string, unknown>;
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id);
        
        if (error) throw error;
        responseData = { success: true };
        break;
      }

      case 'get-social-links': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) throw new Error('Profile not found');

        const { data: links, error } = await supabase
          .from('social_links')
          .select('*')
          .eq('profile_id', profile.id)
          .order('display_order');
        
        if (error) throw error;
        responseData = { links };
        break;
      }

      case 'get-badges': {
        const { data: badges, error } = await supabase
          .from('user_badges')
          .select(`
            id,
            is_enabled,
            is_locked,
            claimed_at,
            global_badges (
              id,
              name,
              description,
              color,
              icon_url,
              rarity
            )
          `)
          .eq('user_id', user.id);
        
        if (error) throw error;
        responseData = { badges };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Always encrypt response for encrypted requests
    if (isEncrypted) {
      const encryptedResponse = await encryptResponse(responseData, userKey);
      return new Response(
        JSON.stringify(encryptedResponse),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-encrypted': 'true'
          } 
        }
      );
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Encrypted API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
