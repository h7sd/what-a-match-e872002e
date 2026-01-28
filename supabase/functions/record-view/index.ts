import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
};

// Simple hash function for IP anonymization
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 16));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profile_id } = await req.json();

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    
    // Hash the IP for privacy
    const ipHash = await hashIP(clientIp);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this IP has already viewed this profile recently (30 min window)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: existingView } = await supabase
      .from('profile_views')
      .select('id')
      .eq('profile_id', profile_id)
      .eq('viewer_ip_hash', ipHash)
      .gte('viewed_at', thirtyMinutesAgo)
      .limit(1);

    if (existingView && existingView.length > 0) {
      // Already viewed recently, skip
      console.log(`Duplicate view blocked for profile ${profile_id} from IP hash ${ipHash.slice(0, 8)}...`);
      return new Response(
        JSON.stringify({ success: true, recorded: false, reason: 'duplicate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the view
    const { error: insertError } = await supabase
      .from('profile_views')
      .insert({
        profile_id,
        viewer_ip_hash: ipHash,
      });

    if (insertError) {
      console.error('Error recording view:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record view' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`View recorded for profile ${profile_id} from IP hash ${ipHash.slice(0, 8)}...`);

    return new Response(
      JSON.stringify({ success: true, recorded: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in record-view function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
