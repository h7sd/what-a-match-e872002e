import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-signature, x-timestamp",
};

const DISCORD_WEBHOOK_SECRET = Deno.env.get("DISCORD_WEBHOOK_SECRET");

// Verify HMAC signature from Discord bot
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
    const data = JSON.parse(body);
    const { action } = data;

    // Actions from Discord bot (require signature verification)
    if (action === "approve" || action === "deny") {
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

      const { requestId, denialReason, editedName, editedDescription, editedColor, editedIconUrl } = data;

      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from("badge_requests")
        .select("*, profiles!inner(username)")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        console.error("Error fetching request:", fetchError);
        return new Response(
          JSON.stringify({ error: "Request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
      const userEmail = userData?.user?.email;

      if (action === "approve") {
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

        // Update request status
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
              <head>
                <meta charset="utf-8">
              </head>
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
                              <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background-color: ${finalColor}20; margin-bottom: 12px;">
                                <span style="font-size: 24px; line-height: 48px;">✨</span>
                              </div>
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
        }

        return new Response(
          JSON.stringify({ success: true, badge }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (action === "deny") {
        // Update request status
        await supabase
          .from("badge_requests")
          .update({
            status: "denied",
            denial_reason: denialReason || "Your request did not meet our guidelines.",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        // Send denial email
        if (userEmail) {
          await sendEmail(
            userEmail,
            "Badge Request Update",
            `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" style="max-width: 500px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <tr>
                          <td style="padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">Badge Request Update</h1>
                            <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                              Unfortunately, your badge request for <strong style="color: #ffffff;">"${request.badge_name}"</strong> was not approved.
                            </p>
                            <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                              <p style="color: #fca5a5; margin: 0; font-size: 14px;">
                                <strong>Reason:</strong> ${denialReason || "Your request did not meet our guidelines."}
                              </p>
                            </div>
                            <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 14px; line-height: 1.6;">
                              You can submit a new request with different details from your dashboard.
                            </p>
                            <a href="https://uservault.cc/dashboard" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
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
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action from frontend: submit new request
    if (action === "submit") {
      // Verify JWT from frontend
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { badgeName, badgeDescription, badgeColor, badgeIconUrl } = data;

      // Check if user already has a request
      const { data: existingRequest } = await supabase
        .from("badge_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .single();

      if (existingRequest && existingRequest.status === "pending") {
        return new Response(
          JSON.stringify({ error: "You already have a pending request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingRequest && existingRequest.status === "approved") {
        return new Response(
          JSON.stringify({ error: "You already have an approved badge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete old denied request if exists
      if (existingRequest && existingRequest.status === "denied") {
        await supabase
          .from("badge_requests")
          .delete()
          .eq("id", existingRequest.id);
      }

      // Get user profile for username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, uid_number")
        .eq("user_id", user.id)
        .single();

      // Create new request
      const { data: newRequest, error: insertError } = await supabase
        .from("badge_requests")
        .insert({
          user_id: user.id,
          badge_name: badgeName,
          badge_description: badgeDescription,
          badge_color: badgeColor,
          badge_icon_url: badgeIconUrl,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating request:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send to Discord channel
      const discordWebhook = Deno.env.get("DISCORD_BADGE_REQUEST_WEBHOOK");
      if (discordWebhook) {
        await fetch(discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "🏷️ New Badge Request",
              color: parseInt(badgeColor.replace("#", ""), 16),
              fields: [
                { name: "User", value: `@${profile?.username || "Unknown"} (UID: ${profile?.uid_number || "N/A"})`, inline: true },
                { name: "Request ID", value: newRequest.id, inline: true },
                { name: "Badge Name", value: badgeName, inline: false },
                { name: "Description", value: badgeDescription || "No description", inline: false },
                { name: "Color", value: badgeColor, inline: true },
                { name: "Icon URL", value: badgeIconUrl || "No custom icon", inline: false },
              ],
              thumbnail: badgeIconUrl ? { url: badgeIconUrl } : undefined,
              timestamp: new Date().toISOString(),
            }],
            components: [{
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  label: "Approve",
                  custom_id: `badge_approve_${newRequest.id}`,
                },
                {
                  type: 2,
                  style: 4,
                  label: "Deny",
                  custom_id: `badge_deny_${newRequest.id}`,
                },
                {
                  type: 2,
                  style: 2,
                  label: "Edit & Approve",
                  custom_id: `badge_edit_${newRequest.id}`,
                },
              ],
            }],
          }),
        });
      }

      return new Response(
        JSON.stringify({ success: true, request: newRequest }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get user's request status
    if (action === "status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: request } = await supabase
        .from("badge_requests")
        .select("*")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({ request }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in badge-request function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
