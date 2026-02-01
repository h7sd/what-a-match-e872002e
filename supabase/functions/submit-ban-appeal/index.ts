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
    const { userId, appealText } = await req.json();

    if (!userId || !appealText) {
      throw new Error("Missing user ID or appeal text");
    }

    if (appealText.trim().length < 10) {
      throw new Error("Appeal text must be at least 10 characters");
    }

    if (appealText.length > 2000) {
      throw new Error("Appeal text must be less than 2000 characters");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is banned and appeal deadline hasn't passed
    const { data: banRecord, error: banError } = await supabaseClient
      .from('banned_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (banError || !banRecord) {
      throw new Error("No ban record found");
    }

    // Check if appeal deadline has passed
    if (new Date(banRecord.appeal_deadline) < new Date()) {
      throw new Error("Appeal deadline has passed");
    }

    // Check if already appealed
    if (banRecord.appeal_submitted_at) {
      throw new Error("You have already submitted an appeal");
    }

    // Submit the appeal
    const { error: updateError } = await supabaseClient
      .from('banned_users')
      .update({
        appeal_text: appealText.trim(),
        appeal_submitted_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error submitting appeal:", updateError);
      throw new Error("Failed to submit appeal");
    }

    console.log("Appeal submitted for user:", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error submitting appeal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
