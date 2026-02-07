import { serve } from "jsr:@std/http@1/server";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple auth for cron jobs - use a secret token
const CLEANUP_SECRET = Deno.env.get("CLEANUP_SECRET") || "internal-cleanup-token";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request - only allow internal calls or with secret
    const authHeader = req.headers.get("Authorization");
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret") || authHeader?.replace("Bearer ", "");
    
    // Check if this is an internal Supabase call or has valid secret
    const isInternalCall = req.headers.get("x-supabase-function-invoke") === "true";
    const hasValidSecret = providedSecret === CLEANUP_SECRET;
    
    if (!isInternalCall && !hasValidSecret) {
      console.log("Unauthorized cleanup attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Run maintenance tasks (including returning stolen badges)
    const { data: returnedBadgesCount, error: returnError } = await supabase
      .rpc('return_stolen_badges');

    if (returnError) {
      console.error("Return stolen badges error:", returnError);
      throw returnError;
    }

    const { data: verificationCodesCleaned, error: codesError } = await supabase
      .rpc('cleanup_expired_verification_codes');

    if (codesError) {
      console.error("Verification codes cleanup error:", codesError);
      throw codesError;
    }

    // Expired profile comments
    const { error: commentsError } = await supabase
      .rpc('cleanup_expired_comments');

    if (commentsError) {
      console.error("Comments cleanup error:", commentsError);
      // Non-fatal
    }

    // Also cleanup old profile views (older than 90 days) to prevent table bloat
    const { error: viewsError } = await supabase
      .from('profile_views')
      .delete()
      .lt('viewed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (viewsError) {
      console.error("Profile views cleanup error:", viewsError);
    }

    // Cleanup old link clicks (older than 90 days)
    const { error: clicksError } = await supabase
      .from('link_clicks')
      .delete()
      .lt('clicked_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (clicksError) {
      console.error("Link clicks cleanup error:", clicksError);
    }

    console.log(
      `Security cleanup completed. Badges returned: ${returnedBadgesCount ?? 0}. Verification codes cleaned: ${verificationCodesCleaned}`
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        badges_returned: returnedBadgesCount ?? 0,
        verification_codes_cleaned: verificationCodesCleaned,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Security cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
