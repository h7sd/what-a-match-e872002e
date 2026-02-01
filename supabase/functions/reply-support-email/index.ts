import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReplyRequest {
  ticketId: string;
  message: string;
  closeTicket?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid token");
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }

    const { ticketId, message, closeTicket }: ReplyRequest = await req.json();

    if (!ticketId || !message) {
      throw new Error("Missing ticketId or message");
    }

    // Get ticket info
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // Store the reply message
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        message: message,
        sender_type: "admin",
        sender_id: user.id,
      });

    if (messageError) {
      console.error("Error storing reply:", messageError);
      throw new Error("Failed to store reply");
    }

    // Update ticket status
    const newStatus = closeTicket ? "closed" : "in_progress";
    const { error: updateError } = await supabase
      .from("support_tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (updateError) {
      console.error("Error updating ticket:", updateError);
    }

    // Send email reply
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
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 40px;">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <div style="font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">UV</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Support Reply</h1>
                    <p style="color: #71717a; font-size: 14px; margin: 10px 0 0 0;">Re: ${ticket.subject}</p>
                  </td>
                </tr>
                <tr>
                  <td style="color: #e4e4e7; font-size: 16px; line-height: 1.8; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 8px; white-space: pre-wrap;">
                    ${message.replace(/\n/g, '<br>')}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: #71717a; font-size: 12px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                    <p style="margin: 0;">Reply to this email to continue the conversation.</p>
                    <p style="margin: 8px 0 0 0;">UserVault Support Team</p>
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
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "UserVault Support <support@uservault.cc>",
        to: [ticket.email],
        subject: `Re: ${ticket.subject}`,
        html: emailHtml,
        reply_to: "support@uservault.cc",
      }),
    });

    const emailData = await emailRes.json();
    console.log("Reply email sent:", emailData);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending reply:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
