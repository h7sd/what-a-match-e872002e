import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};



interface AliasRequestBody {
  action: "create" | "respond";
  requestedAlias?: string;
  requestId?: string;
  response?: "approved" | "denied";
  token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to send emails
    const sendEmail = async (to: string, subject: string, html: string) => {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "UserVault <noreply@uservault.cc>",
            to: [to],
            subject,
            html,
          }),
        });
        const data = await res.json();
        console.log("Email sent:", data);
        return data;
      } catch (error) {
        console.error("Email error:", error);
        throw error;
      }
    };

    const body: AliasRequestBody = await req.json();
    const { action } = body;

    if (action === "create") {
      // Get the authenticated user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { requestedAlias } = body;
      if (!requestedAlias || typeof requestedAlias !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing requestedAlias" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Validate alias format - must match signup validation rules
      const normalizedAlias = requestedAlias.toLowerCase().trim();
      const aliasRegex = /^[a-zA-Z0-9_]+$/;
      
      if (normalizedAlias.length < 1 || normalizedAlias.length > 20) {
        return new Response(
          JSON.stringify({ error: "Username must be between 1 and 20 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      if (!aliasRegex.test(normalizedAlias)) {
        return new Response(
          JSON.stringify({ error: "Username can only contain letters, numbers and underscores" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if alias is already taken as someone's username
      const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, username, display_name")
        .eq("username", requestedAlias.toLowerCase())
        .single();

      if (profileError || !targetProfile) {
        return new Response(
          JSON.stringify({ error: "Username not found", available: true }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Can't request your own username
      if (targetProfile.user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot request your own username as alias" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if there's already a pending request
      const { data: existingRequest } = await supabase
        .from("alias_requests")
        .select("id")
        .eq("requester_id", user.id)
        .eq("requested_alias", requestedAlias.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        return new Response(
          JSON.stringify({ error: "You already have a pending request for this alias" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check 1-hour cooldown after denied request
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: recentDeniedRequest } = await supabase
        .from("alias_requests")
        .select("id, responded_at")
        .eq("requester_id", user.id)
        .eq("status", "denied")
        .gte("responded_at", oneHourAgo.toISOString())
        .order("responded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentDeniedRequest) {
        const nextAllowedTime = new Date(recentDeniedRequest.responded_at);
        nextAllowedTime.setHours(nextAllowedTime.getHours() + 1);
        const minutesRemaining = Math.ceil((nextAllowedTime.getTime() - Date.now()) / (1000 * 60));
        
        return new Response(
          JSON.stringify({ 
            error: `Your last request was denied. You can request again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
            nextAllowedTime: nextAllowedTime.toISOString(),
            minutesRemaining
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check 15-day rate limit - user can only request once every 15 days
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: recentRequest } = await supabase
        .from("alias_requests")
        .select("id, created_at")
        .eq("requester_id", user.id)
        .gte("created_at", fifteenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentRequest) {
        const nextAllowedDate = new Date(recentRequest.created_at);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 15);
        const daysRemaining = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return new Response(
          JSON.stringify({ 
            error: `You can only request a username once every 15 days. Try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
            nextAllowedDate: nextAllowedDate.toISOString(),
            daysRemaining
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get requester's profile
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", user.id)
        .single();

      // Create the request
      const { data: newRequest, error: insertError } = await supabase
        .from("alias_requests")
        .insert({
          requester_id: user.id,
          target_user_id: targetProfile.user_id,
          requested_alias: requestedAlias.toLowerCase(),
        })
        .select("id, response_token")
        .single();

      if (insertError) {
        console.error("Error creating request:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create request" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get target user's email
      const { data: targetUser } = await supabase.auth.admin.getUserById(targetProfile.user_id);
      
      if (targetUser?.user?.email) {
        const siteUrl = (() => {
          const origin = req.headers.get("origin");
          if (origin && (origin.startsWith("http://") || origin.startsWith("https://"))) return origin;

          const referer = req.headers.get("referer");
          if (referer) {
            try {
              return new URL(referer).origin;
            } catch {
              // ignore
            }
          }

          // Fallback (should rarely be used)
          return "https://uservault.cc";
        })();
        const approveUrl = `${siteUrl}/alias-respond?token=${newRequest.response_token}&action=approve`;
        const denyUrl = `${siteUrl}/alias-respond?token=${newRequest.response_token}&action=deny`;

        // Send email notification
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 40px;">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <div style="font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">UV</div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Alias Request</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; font-size: 16px; line-height: 1.6; padding-bottom: 30px;">
                          <p style="margin: 0 0 16px 0;"><strong style="color: #ffffff;">@${requesterProfile?.username || "Someone"}</strong> wants to take over your username <strong style="color: #8B5CF6;">@${requestedAlias}</strong>.</p>
                          <p style="margin: 0;">If you approve, your usernames will be swapped - you will get their current username <strong style="color: #8B5CF6;">@${requesterProfile?.username || "their username"}</strong> instead.</p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 12px;">
                                <a href="${approveUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">✓ Approve</a>
                              </td>
                              <td>
                                <a href="${denyUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">✕ Deny</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="color: #71717a; font-size: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                          <p style="margin: 0;">You can also respond in your dashboard under Overview.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
          await sendEmail(targetUser.user.email, `Alias Request for @${requestedAlias}`, emailHtml);
          console.log("Alias request email sent to:", targetUser.user.email);
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Request sent successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "respond") {
      const { requestId, response, token } = body;

      if (!response || (response !== "approved" && response !== "denied")) {
        return new Response(
          JSON.stringify({ error: "Invalid response" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let request;

      // If token is provided, use it (from email link)
      if (token) {
        const { data, error } = await supabase
          .from("alias_requests")
          .select("*, requester:profiles!alias_requests_requester_id_fkey(username, display_name)")
          .eq("response_token", token)
          .eq("status", "pending")
          .single();

        if (error || !data) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired token" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        request = data;
      } else if (requestId) {
        // Otherwise check auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const authToken = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data, error } = await supabase
          .from("alias_requests")
          .select("*")
          .eq("id", requestId)
          .eq("target_user_id", user.id)
          .eq("status", "pending")
          .single();

        if (error || !data) {
          return new Response(
            JSON.stringify({ error: "Request not found or already responded" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        request = data;
      } else {
        return new Response(
          JSON.stringify({ error: "Missing requestId or token" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("alias_requests")
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) {
        console.error("Error updating request:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update request" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // If approved, swap the usernames - requester takes over the username
      if (response === "approved") {
        // Get the requester's current username
        const { data: requesterProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", request.requester_id)
          .single();

        const requesterOldUsername = requesterProfile?.username;

        // Update requester's username to the requested alias
        const { error: requesterUpdateError } = await supabase
          .from("profiles")
          .update({ 
            username: request.requested_alias,
            alias_username: null // Clear any existing alias
          })
          .eq("user_id", request.requester_id);

        if (requesterUpdateError) {
          console.error("Error updating requester username:", requesterUpdateError);
          return new Response(
            JSON.stringify({ error: "Failed to update username" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Update target's username to the requester's old username (swap)
        if (requesterOldUsername) {
          const { error: targetUpdateError } = await supabase
            .from("profiles")
            .update({ username: requesterOldUsername })
            .eq("user_id", request.target_user_id);

          if (targetUpdateError) {
            console.error("Error updating target username:", targetUpdateError);
            // Note: We don't rollback here as partial swap is acceptable
          }
        }

        console.log(`Username swap complete: ${requesterOldUsername} <-> ${request.requested_alias}`);
      }

      // Get requester's email to notify them
      const { data: requesterUser } = await supabase.auth.admin.getUserById(request.requester_id);
      
      if (requesterUser?.user?.email) {
        try {
          const statusColor = response === "approved" ? "#22c55e" : "#ef4444";
          const statusText = response === "approved" ? "Approved ✓" : "Denied ✕";
          const messageText = response === "approved" 
            ? `Your alias request for <strong style="color: #8B5CF6;">@${request.requested_alias}</strong> has been approved! You can now use this handle.`
            : `Your alias request for <strong style="color: #8B5CF6;">@${request.requested_alias}</strong> has been denied.`;

          const responseHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 40px;">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <div style="font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">UV</div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <span style="display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: #ffffff; border-radius: 20px; font-weight: 600; font-size: 14px;">${statusText}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                          <p style="margin: 0;">${messageText}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
          await sendEmail(
            requesterUser.user.email,
            `Alias Request ${response === "approved" ? "Approved" : "Denied"}: @${request.requested_alias}`,
            responseHtml
          );
          console.log("Response notification sent to:", requesterUser.user.email);
        } catch (emailError) {
          console.error("Failed to send response email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: response }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in alias-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
