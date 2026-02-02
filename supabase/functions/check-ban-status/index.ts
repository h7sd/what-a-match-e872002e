import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 30;

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  // Check rate limit
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json", 
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
          ...corsHeaders 
        } 
      }
    );
  }

  try {
    const { userId, username } = await req.json();

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve userId from username if needed
    let resolvedUserId = userId;
    
    if (!resolvedUserId && username) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      if (profile) {
        resolvedUserId = profile.user_id;
      }
    }

    if (!resolvedUserId) {
      return new Response(JSON.stringify({ isBanned: false }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json", 
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          ...corsHeaders 
        },
      });
    }

    // Use the secure SECURITY DEFINER function instead of direct table access
    const { data: banStatus, error: banError } = await supabaseClient
      .rpc('check_user_ban_status', { p_user_id: resolvedUserId });

    if (banError) {
      console.error("Error checking ban status:", banError);
      return new Response(JSON.stringify({ isBanned: false }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          ...corsHeaders 
        },
      });
    }

    if (!banStatus || banStatus.length === 0 || !banStatus[0].is_banned) {
      return new Response(JSON.stringify({ isBanned: false }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          ...corsHeaders 
        },
      });
    }

    return new Response(JSON.stringify({
      isBanned: true,
      canAppeal: banStatus[0].can_appeal,
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        ...corsHeaders 
      },
    });
  } catch (error: any) {
    console.error("Error checking ban status:", error);
    return new Response(
      JSON.stringify({ isBanned: false }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
