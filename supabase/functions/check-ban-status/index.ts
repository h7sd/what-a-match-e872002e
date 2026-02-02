import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is banned
    const { data: banRecord, error: banError } = await supabaseClient
      .from('banned_users')
      .select('reason, banned_at, appeal_deadline, appeal_submitted_at')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (banError) {
      console.error("Error checking ban status:", banError);
      return new Response(JSON.stringify({ isBanned: false }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!banRecord) {
      return new Response(JSON.stringify({ isBanned: false }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if appeal deadline has passed
    const appealDeadlinePassed = new Date(banRecord.appeal_deadline) < new Date();
    const canAppeal = !appealDeadlinePassed && !banRecord.appeal_submitted_at;

    return new Response(JSON.stringify({
      isBanned: true,
      canAppeal,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
