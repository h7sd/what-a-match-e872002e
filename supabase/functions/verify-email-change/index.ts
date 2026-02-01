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
    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { code, newEmail } = await req.json();

    if (!code || !newEmail) {
      throw new Error("Missing code or new email");
    }

    const currentEmail = user.email;
    if (!currentEmail) {
      throw new Error("No current email found");
    }

    // Verify the code
    const { data: codeRecord, error: codeError } = await supabaseClient
      .from('verification_codes')
      .select('*')
      .eq('email', currentEmail)
      .eq('code', code)
      .eq('type', 'email_change')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !codeRecord) {
      throw new Error("Invalid or expired verification code");
    }

    // Mark code as used
    await supabaseClient
      .from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeRecord.id);

    // Update the user's email using admin API
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { email: newEmail }
    );

    if (updateError) {
      console.error("Error updating email:", updateError);
      throw new Error("Failed to update email address");
    }

    console.log("Email successfully changed for user:", user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error verifying email change:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
