
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { linkId } = await req.json();

    if (!linkId) {
      return new Response(
        JSON.stringify({ error: "Missing linkId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get viewer's IP for deduplication
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
    
    // Hash the IP for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + linkId);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Check if this IP clicked this link in the last 5 minutes
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: recentClick } = await supabase
      .from("link_clicks")
      .select("id")
      .eq("link_id", linkId)
      .eq("viewer_ip_hash", ipHash)
      .gte("clicked_at", fiveMinutesAgo.toISOString())
      .maybeSingle();

    if (recentClick) {
      return new Response(
        JSON.stringify({ success: true, message: "Click already recorded" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get country from CF headers
    const country = req.headers.get("cf-ipcountry") || null;

    // Record the click
    const { error: clickError } = await supabase
      .from("link_clicks")
      .insert({
        link_id: linkId,
        viewer_ip_hash: ipHash,
        viewer_country: country,
      });

    if (clickError) {
      console.error("Error recording click:", clickError);
      return new Response(
        JSON.stringify({ error: "Failed to record click" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Increment the click count on the link
    const { error: updateError } = await supabase.rpc('increment_link_click_count', { 
      p_link_id: linkId 
    });

    // If RPC doesn't exist, do a manual update
    if (updateError) {
      await supabase
        .from("social_links")
        .update({ click_count: supabase.rpc('coalesce', { val: 0 }) })
        .eq("id", linkId);
    }

    console.log(`Link click recorded for ${linkId} from ${country || 'unknown'}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in record-link-click function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
