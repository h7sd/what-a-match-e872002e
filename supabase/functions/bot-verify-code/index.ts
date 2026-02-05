import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

// Generate a random 6-character alphanumeric code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding confusing characters like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Verify HMAC signature from Discord bot
async function verifyBotSignature(
  payload: string,
  signatureHeader: string,
  timestamp: string,
): Promise<boolean> {
  const message = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();

  return signatureHeader.trim().toLowerCase() === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if this is a bot request (has webhook signature) or user request (has auth header)
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const authHeader = req.headers.get("authorization");

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    const { action } = body;

    // ============ USER ACTIONS (requires auth) ============
    if (action === "generate" || action === "get_current") {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify user token
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (action === "get_current") {
        // Get current active code
        const { data: existingCode } = await supabase
          .from("discord_bot_verification")
          .select("code, expires_at, created_at")
          .eq("user_id", user.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingCode) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              code: existingCode.code,
              expires_at: existingCode.expires_at,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, code: null }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (action === "generate") {
        // Delete any existing unused codes for this user
        await supabase
          .from("discord_bot_verification")
          .delete()
          .eq("user_id", user.id)
          .is("used_at", null);

        // Generate new code
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        const { error: insertError } = await supabase
          .from("discord_bot_verification")
          .insert({
            user_id: user.id,
            code: code,
            expires_at: expiresAt,
          });

        if (insertError) {
          console.error("Error creating verification code:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create code" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        console.log(`Generated bot verification code for user ${user.id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            code,
            expires_at: expiresAt,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ============ BOT ACTIONS (requires webhook signature) ============
    if (action === "verify") {
      // Verify bot signature
      if (!signature || !timestamp) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const isValid = await verifyBotSignature(bodyText, signature, timestamp);
      if (!isValid) {
        console.error("Invalid webhook signature for bot-verify-code");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check timestamp (5 minute window)
      const timestampAge = Date.now() - parseInt(timestamp);
      if (timestampAge > 300000) {
        return new Response(
          JSON.stringify({ error: "Request expired" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { code, discordUserId } = body;

      if (!code || !discordUserId) {
        return new Response(
          JSON.stringify({ error: "Code and Discord user ID are required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find the verification code
      const { data: verification, error: verifyError } = await supabase
        .from("discord_bot_verification")
        .select("id, user_id")
        .eq("code", code.toUpperCase())
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (verifyError || !verification) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired code" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if this Discord ID is already linked to another account
      const { data: existingLink } = await supabase
        .from("profiles")
        .select("username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: `Already linked to ${existingLink.username}. Use /unlink first.` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, discord_user_id")
        .eq("user_id", verification.user_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if this profile is already linked to a different Discord
      if (profile.discord_user_id && profile.discord_user_id !== discordUserId) {
        return new Response(
          JSON.stringify({ error: "This account is already linked to another Discord" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark code as used
      await supabase
        .from("discord_bot_verification")
        .update({ used_at: new Date().toISOString(), discord_user_id: discordUserId })
        .eq("id", verification.id);

      // Link the Discord to the profile
      await supabase
        .from("profiles")
        .update({ discord_user_id: discordUserId })
        .eq("user_id", verification.user_id);

      console.log(`Linked Discord ${discordUserId} to user ${profile.username} via verification code`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          username: profile.username,
          message: `Successfully linked to ${profile.username}!`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in bot-verify-code:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
