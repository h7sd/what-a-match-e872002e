import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp',
};

// Verify HMAC signature from Discord bot
async function verifySignature(payload: string, signature: string, timestamp: string, secret: string): Promise<boolean> {
  const message = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('DISCORD_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('DISCORD_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    
    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or timestamp' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check timestamp (5 minute window)
    const requestTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return new Response(
        JSON.stringify({ error: 'Request expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    
    const isValid = await verifySignature(body, signature, timestamp, webhookSecret);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending badge requests
    const { data: requests, error: requestsError } = await supabase
      .from('badge_requests')
      .select('id, user_id, badge_name, badge_description, badge_color, badge_icon_url, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (requestsError) {
      console.error('Error fetching badge requests:', requestsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch requests' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ requests: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch profile info for each user
    const userIds = [...new Set(requests.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, uid_number')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Fetch emails via auth admin API
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      const profile = profileMap.get(request.user_id);
      
      let email = 'N/A';
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
        email = userData?.user?.email || 'N/A';
      } catch {
        // ignore
      }

      return {
        ...request,
        username: profile?.username || 'Unknown',
        uid_number: profile?.uid_number ?? null,
        email,
      };
    }));

    console.log(`Returning ${enrichedRequests.length} pending badge requests`);

    return new Response(
      JSON.stringify({ requests: enrichedRequests }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bot-badge-requests:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
