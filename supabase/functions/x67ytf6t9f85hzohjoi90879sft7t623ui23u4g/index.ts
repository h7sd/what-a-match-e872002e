import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DISCORD_WEBHOOK_SECRET = Deno.env.get("DISCORD_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-timestamp",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "UserVault <noreply@uservault.cc>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

async function verifySignature(
  payload: string,
  signature: string,
  timestamp: number
): Promise<boolean> {
  if (!DISCORD_WEBHOOK_SECRET) {
    console.error("DISCORD_WEBHOOK_SECRET not configured");
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.error("Timestamp too old or in future");
    return false;
  }

  const message = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(DISCORD_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("x-signature");
    const timestamp = req.headers.get("x-timestamp");

    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifySignature(body, signature, parseInt(timestamp));
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(body);
    const { requestId, editedName, editedDescription, editedColor, editedIconUrl } = data;

    console.log(`[EDIT-APPROVE] Processing request: ${requestId}`);

    // Get the request (NO join: badge_requests has no FK to profiles)
    const { data: request, error: fetchError } = await supabase
      .from("badge_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("Error fetching request:", fetchError);
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", request.user_id)
      .maybeSingle();

    console.log(
      `[EDIT-APPROVE] Found request for user: ${request.user_id}${profile?.username ? ` (@${profile.username})` : ""}`
    );

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
    const userEmail = userData?.user?.email;

    // Use edited values if provided, otherwise use original
    const finalName = editedName || request.badge_name;
    const finalDescription = editedDescription !== undefined ? editedDescription : request.badge_description;
    const finalColor = editedColor || request.badge_color;
    const finalIconUrl = editedIconUrl !== undefined ? editedIconUrl : request.badge_icon_url;

    // Create global badge
    const { data: badge, error: badgeError } = await supabase
      .from("global_badges")
      .insert({
        name: finalName,
        description: finalDescription,
        color: finalColor,
        icon_url: finalIconUrl,
        rarity: "common",
        is_limited: true,
        max_claims: 1,
        claims_count: 0,
      })
      .select()
      .single();

    if (badgeError) {
      console.error("Error creating badge:", badgeError);
      return new Response(
        JSON.stringify({ error: "Failed to create badge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EDIT-APPROVE] Created badge: ${badge.id}`);

    // Assign badge to user
    const { error: assignError } = await supabase
      .from("user_badges")
      .insert({
        user_id: request.user_id,
        badge_id: badge.id,
        is_enabled: true,
      });

    if (assignError) {
      console.error("Error assigning badge:", assignError);
    }

    // Update request status with edited values
    await supabase
      .from("badge_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        admin_edited_name: editedName || null,
        admin_edited_description: editedDescription || null,
        admin_edited_color: editedColor || null,
        admin_edited_icon_url: editedIconUrl || null,
      })
      .eq("id", requestId);

    // Send approval email
    if (userEmail) {
      await sendEmail(
        userEmail,
        "Your Badge Request Has Been Approved! 🎉",
        `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width: 500px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3);">
                    <tr>
                      <td style="padding: 40px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                        <h1 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">Badge Approved!</h1>
                        <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                          Great news! Your custom badge request has been approved and added to your profile.
                        </p>
                        <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                          <h3 style="color: ${finalColor}; margin: 0 0 8px 0; font-size: 18px;">${finalName}</h3>
                          ${finalDescription ? `<p style="color: #a1a1aa; margin: 0; font-size: 14px;">${finalDescription}</p>` : ''}
                        </div>
                        <a href="https://uservault.cc/dashboard" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Your Badge</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 40px 30px 40px; text-align: center;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">UserVault • Custom Profiles</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      );
    } else {
      console.warn(`[EMAIL] No email found for user ${request.user_id}; skipping email send`);
    }

    console.log(`[EDIT-APPROVE] Success for request: ${requestId}`);

    return new Response(
      JSON.stringify({ success: true, badge }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in edit-approve function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
