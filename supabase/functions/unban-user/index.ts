import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-supabase-client-platform",
    "x-supabase-client-platform-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
  ].join(", "),
  "Access-Control-Max-Age": "86400",
};

// Helper to send emails
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
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
    const data = await res.json();
    console.log("Email sent:", data);
    return data;
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get and verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid token");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }

    const { odst4jf490 } = await req.json();

    if (!odst4jf490) {
      throw new Error("User ID is required");
    }

    console.log("Unbanning user:", odst4jf490);

    // Get the banned user's info before deleting the record
    const { data: bannedUser, error: fetchError } = await supabaseClient
      .from("banned_users")
      .select("username, email, user_id")
      .eq("user_id", odst4jf490)
      .single();

    if (fetchError || !bannedUser) {
      console.error("Error fetching banned user:", fetchError);
      throw new Error("Banned user not found");
    }

    // Delete the ban record
    const { error: deleteError } = await supabaseClient
      .from("banned_users")
      .delete()
      .eq("user_id", odst4jf490);

    if (deleteError) {
      console.error("Error deleting ban record:", deleteError);
      throw new Error("Failed to unban user");
    }

    console.log("User unbanned successfully:", odst4jf490);

    // Send welcome back email if we have an email address
    if (bannedUser.email) {
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
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; padding: 40px;">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <div style="font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #22c55e, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">UV</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Welcome Back, ${bannedUser.username}! 🎉</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #a1a1aa; font-size: 16px; line-height: 1.6; padding-bottom: 30px;">
                        <p style="margin: 0 0 16px 0;">Great news! Your account has been unbanned and you now have full access to UserVault again.</p>
                        <p style="margin: 0 0 16px 0;">We're glad to have you back in our community. Please make sure to follow our community guidelines to ensure a positive experience for everyone.</p>
                        <p style="margin: 0;">If you have any questions, feel free to reach out to our support team.</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <a href="https://uservault.cc/auth" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22c55e, #10b981); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Login to Your Account</a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="color: #71717a; font-size: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="margin: 0;">Welcome back to UserVault!</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
        await sendEmail(bannedUser.email, `Welcome Back to UserVault, ${bannedUser.username}!`, emailHtml);
        console.log("Welcome back email sent to:", bannedUser.email);
      } catch (emailError) {
        console.error("Failed to send welcome back email:", emailError);
        // Don't fail the unban if email fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error unbanning user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
