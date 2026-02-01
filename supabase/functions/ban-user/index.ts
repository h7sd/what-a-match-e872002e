import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Resend API error:", errorText);
    // Don't throw - we still want to ban even if email fails
  }
  
  return res.ok;
}

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
    
    // Verify the JWT token and check admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: adminUser.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const { userId, username, reason } = await req.json();

    if (!userId || !username) {
      throw new Error("Missing user ID or username");
    }

    // Get user's email
    const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    // Calculate appeal deadline (30 days from now)
    const appealDeadline = new Date();
    appealDeadline.setDate(appealDeadline.getDate() + 30);

    // Insert into banned_users table
    const { error: banError } = await supabaseClient
      .from('banned_users')
      .insert({
        user_id: userId,
        username: username,
        email: userEmail,
        reason: reason || 'No reason provided',
        banned_by: adminUser.id,
        appeal_deadline: appealDeadline.toISOString(),
      });

    if (banError) {
      console.error("Error inserting ban record:", banError);
      throw new Error("Failed to ban user");
    }

    // Send ban notification email if we have email
    if (userEmail) {
      const html = `
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
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="max-width: 500px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 16px;">
                            <span style="color: white; font-weight: bold; font-size: 24px; line-height: 60px;">UV</span>
                          </td>
                        </tr>
                      </table>
                      <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: 700; text-align: center;">UserVault</h1>
                    </td>
                  </tr>
                  
                  <!-- Main Card -->
                  <tr>
                    <td style="background: linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 40px;">
                      <h2 style="color: #ef4444; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
                        Account Suspended
                      </h2>
                      <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                        Your UserVault account <strong style="color: #ffffff;">@${username}</strong> has been suspended.
                      </p>
                      
                      <!-- Reason Box -->
                      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Reason</p>
                        <p style="color: #ffffff; font-size: 15px; margin: 0; line-height: 1.5;">${reason || 'No reason provided'}</p>
                      </div>
                      
                      <p style="color: #a1a1aa; margin: 20px 0; font-size: 14px; line-height: 1.6; text-align: center;">
                        You have <strong style="color: #f59e0b;">30 days</strong> to submit an appeal request when you try to log in.
                      </p>
                      
                      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 20px;">
                        <p style="color: #71717a; font-size: 13px; margin: 0; text-align: center;">
                          Appeal deadline: <strong style="color: #a1a1aa;">${appealDeadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #52525b; font-size: 12px; margin: 0;">
                        If you believe this was a mistake, please submit an appeal when logging in.
                      </p>
                      <p style="color: #3f3f46; font-size: 11px; margin: 16px 0 0 0;">
                        © ${new Date().getFullYear()} UserVault. All rights reserved.
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

      await sendEmail(userEmail, "Account Suspended - UserVault", html);
      console.log("Ban notification email sent to:", userEmail);
    }

    console.log("User banned successfully:", username);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error banning user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
