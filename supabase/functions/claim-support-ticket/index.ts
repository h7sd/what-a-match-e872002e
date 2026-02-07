import { serve } from "jsr:@std/http@1/server";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function claimEmailTemplate(params: {
  subject: string;
  adminName: string;
  adminAvatarUrl?: string | null;
}) {
  const subject = escapeHtml(params.subject || "Support Ticket");
  const adminName = escapeHtml(params.adminName || "Support Team");
  const avatar = params.adminAvatarUrl;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="width:48px;height:48px;background:linear-gradient(135deg,#a855f7 0%,#6366f1 100%);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:#fff;font-weight:700;font-size:18px;">UV</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#111;border:1px solid #222;border-radius:16px;padding:28px;">
              <p style="margin:0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Support Update</p>
              <h1 style="margin:8px 0 0 0;color:#fff;font-size:18px;font-weight:600;">Your ticket is being handled</h1>
              <p style="margin:10px 0 0 0;color:#cfcfcf;font-size:14px;line-height:1.6;">
                <strong>${adminName}</strong> has claimed your ticket and will process it as soon as possible.
              </p>

              <div style="margin-top:18px;padding:14px 16px;background:#0a0a0a;border:1px solid #222;border-radius:12px;">
                <p style="margin:0;color:#888;font-size:12px;">Ticket subject</p>
                <p style="margin:6px 0 0 0;color:#fff;font-size:14px;font-weight:500;">${subject}</p>
              </div>

              <div style="margin-top:18px;border-top:1px solid #222;padding-top:18px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      ${avatar
                        ? `<img src="${avatar}" alt="${adminName}" style="width:36px;height:36px;border-radius:50%;margin-right:12px;" />`
                        : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#a855f7 0%,#6366f1 100%);margin-right:12px;display:inline-block;"></div>`}
                    </td>
                    <td style="vertical-align:middle;">
                      <p style="margin:0;color:#fff;font-size:13px;font-weight:500;">${adminName}</p>
                      <p style="margin:2px 0 0 0;color:#888;font-size:12px;">UserVault Support</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:18px;">
              <p style="margin:0;color:#555;font-size:12px;">Reply to this email to continue the conversation.</p>
              <p style="margin:8px 0 0 0;color:#444;font-size:11px;">© ${new Date().getFullYear()} UserVault</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminUser = userRes.user;
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Missing ticketId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: adminUser.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id, email, subject, claimed_by")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already claimed
    if (ticket.claimed_by) {
      return new Response(JSON.stringify({ success: true, ticket }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("user_id", adminUser.id)
      .maybeSingle();

    const adminName =
      adminProfile?.display_name || adminProfile?.username || "Support Team";
    const adminAvatarUrl = adminProfile?.avatar_url ?? null;

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("support_tickets")
      .update({
        claimed_by: adminUser.id,
        claimed_at: now,
        status: "in_progress",
        updated_at: now,
      })
      .eq("id", ticketId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      console.error("Claim update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to claim ticket" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store internal note (optional, helps audit)
    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      message: `${adminName} claimed this ticket. Will be processed as soon as possible.`,
      sender_type: "admin",
      sender_id: adminUser.id,
    });

    // Notify user via email
    const emailHtml = claimEmailTemplate({
      subject: ticket.subject,
      adminName,
      adminAvatarUrl,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UserVault Support <support@uservault.cc>",
        to: [ticket.email],
        subject: `Update: ${ticket.subject}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend claim email error:", errText);
      // Ticket is claimed; email failure shouldn't break the UI
    }

    return new Response(JSON.stringify({ success: true, ticket: updated, adminName, adminAvatarUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("claim-support-ticket error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
