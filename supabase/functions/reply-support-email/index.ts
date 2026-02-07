import { serve } from "jsr:@std/http@1/server";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { ticketId, message, closeTicket } = await req.json();

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // Get admin profile who is replying
    const authHeader = req.headers.get("Authorization");
    let adminName = "Support Team";
    let adminAvatar = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          adminName = profile.display_name || profile.username || "Support Team";
          adminAvatar = profile.avatar_url;
        }
      }
    }

    // Send email via Resend with clean English template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: 700; font-size: 18px;">UV</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background-color: #111111; border-radius: 16px; border: 1px solid #222222; padding: 32px;">
              
              <!-- Header -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 24px; border-bottom: 1px solid #222222;">
                    <p style="margin: 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                      Support Response
                    </p>
                    <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                      Re: ${ticket.subject}
                    </h1>
                  </td>
                </tr>
              </table>
              
              <!-- Agent Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          ${adminAvatar 
                            ? `<img src="${adminAvatar}" alt="${adminName}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px;">`
                            : `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); margin-right: 12px; display: inline-block;"></div>`
                          }
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 500;">${adminName}</p>
                          <p style="margin: 2px 0 0 0; color: #888888; font-size: 12px;">UserVault Support</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Message -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #0a0a0a; border-radius: 12px; padding: 20px; border-left: 3px solid #a855f7;">
                    <p style="margin: 0; color: #e0e0e0; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                  </td>
                </tr>
              </table>
              
              ${closeTicket ? `
              <!-- Ticket Closed Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-top: 20px;">
                    <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 12px 16px;">
                      <p style="margin: 0; color: #22c55e; font-size: 13px; text-align: center;">
                        ✓ This ticket has been resolved and closed
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; color: #555555; font-size: 12px;">
                Reply to this email to continue the conversation
              </p>
              <p style="margin: 8px 0 0 0; color: #444444; font-size: 11px;">
                © ${new Date().getFullYear()} UserVault • All rights reserved
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UserVault Support <support@uservault.cc>",
        to: [ticket.email],
        subject: `Re: ${ticket.subject}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error("Resend error:", errorText);
      throw new Error("Failed to send email");
    }

    // Get admin user ID for the message
    let adminUserId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      adminUserId = user?.id;
    }

    // Store reply in database
    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      message: message,
      sender_type: "admin",
      sender_id: adminUserId,
    });

    // Update ticket status
    const newStatus = closeTicket ? "closed" : "in_progress";
    await supabase
      .from("support_tickets")
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", ticketId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
