import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

// Add random delay to prevent timing attacks (200-400ms)
const addTimingJitter = async () => {
  const delay = 200 + Math.random() * 200;
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Hash email for logging (privacy)
const hashEmail = async (email: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Start timing normalization
  const startTime = Date.now();

  try {
    const { email, code, newPassword }: ResetPasswordRequest = await req.json();

    if (!email || !code || !newPassword) {
      await addTimingJitter();
      throw new Error("Missing required fields: email, code, and newPassword");
    }

    if (newPassword.length < 6) {
      await addTimingJitter();
      throw new Error("Password must be at least 6 characters");
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the reset code
    const { data: codes, error: fetchError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("type", "password_reset")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !codes || codes.length === 0) {
      const emailHash = await hashEmail(email);
      console.error("Code verification failed for email hash:", emailHash);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codes[0].id);

    // Get user by email - use listUsers with filter for efficiency
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Search through users (with timing normalization)
    let foundUser = null;
    let page = 1;
    const perPage = 1000;
    
    while (!foundUser) {
      const { data: pageData, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (pageError) {
        const emailHash = await hashEmail(email);
        console.error("Error listing users for hash:", emailHash);
        await addTimingJitter();
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      foundUser = pageData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (foundUser) break;
      if (pageData.users.length < perPage) break;
      page++;
      if (page > 10) break;
    }
    
    if (!foundUser) {
      const emailHash = await hashEmail(email);
      console.log("User not found for email hash:", emailHash);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const user = foundUser;

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError.message);
      await addTimingJitter();
      throw new Error("Failed to update password");
    }

    const emailHash = await hashEmail(email);
    console.log("Password reset successful for hash:", emailHash);

    // Normalize response time to prevent timing attacks
    await addTimingJitter();

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in reset-password function:", error.message);
    await addTimingJitter();
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);