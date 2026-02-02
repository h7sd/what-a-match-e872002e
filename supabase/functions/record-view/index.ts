import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 60;

const ipRequests = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipRequests.entries()) {
    if (value.resetTime <= now) ipRequests.delete(key);
  }
}, 60 * 1000);

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRequests.get(ip);

  if (!record || record.resetTime <= now) {
    ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_IP - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_IP) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  ipRequests.set(ip, record);
  return { allowed: true, remaining: MAX_REQUESTS_PER_IP - record.count };
}

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

  // Get client IP for rate limiting
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  // Check rate limit
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0'
        } 
      }
    );
  }

  try {
    const { profile_id, username } = await req.json();

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve profile_id from username if needed
    let resolvedProfileId = profile_id;
    
    if (!resolvedProfileId && username) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      if (profile) {
        resolvedProfileId = profile.id;
      }
    }

    if (!resolvedProfileId) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining)
          } 
        }
      );
    }

    // Hash the IP for privacy
    const ipHash = await hashIP(clientIp);

    // Check if this IP has already viewed this profile recently (30 min window)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: existingView } = await supabase
      .from('profile_views')
      .select('id')
      .eq('profile_id', resolvedProfileId)
      .eq('viewer_ip_hash', ipHash)
      .gte('viewed_at', thirtyMinutesAgo)
      .limit(1);

    if (existingView && existingView.length > 0) {
      // Already viewed recently, skip
      return new Response(
        JSON.stringify({ success: true, recorded: false }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining)
          } 
        }
      );
    }

    // Record the view
    const { error: insertError } = await supabase
      .from('profile_views')
      .insert({
        profile_id: resolvedProfileId,
        viewer_ip_hash: ipHash,
      });

    if (insertError) {
      console.error('Error recording view:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record view' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining)
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, recorded: true }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining)
        } 
      }
    );

  } catch (error) {
    console.error('Error in record-view function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
