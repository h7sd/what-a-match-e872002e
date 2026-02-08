import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminDeleteRequest {
  userId: string;
  username: string;
  email?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify admin status
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !adminUser) {
      throw new Error("Unauthorized");
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }

    const { userId, username, email }: AdminDeleteRequest = await req.json();

    if (!userId || !username) {
      throw new Error("Missing userId or username");
    }

    console.log(`Admin ${adminUser.email} deleting account for user ${username} (${userId})`);

    // Delete user's profile (cascades to related data)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // Delete user's badges
    const { error: badgesError } = await supabaseAdmin
      .from("user_badges")
      .delete()
      .eq("user_id", userId);

    if (badgesError) {
      console.error("Error deleting badges:", badgesError);
    }

    // Delete user's roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Error deleting roles:", rolesError);
    }

    // Delete from banned_users if exists
    const { error: banError } = await supabaseAdmin
      .from("banned_users")
      .delete()
      .eq("user_id", userId);

    if (banError) {
      console.error("Error deleting ban record:", banError);
    }

    // Delete discord integrations
    const { error: discordError } = await supabaseAdmin
      .from("discord_integrations")
      .delete()
      .eq("user_id", userId);

    if (discordError) {
      console.error("Error deleting discord integration:", discordError);
    }

    // Delete spotify integrations
    const { error: spotifyError } = await supabaseAdmin
      .from("spotify_integrations")
      .delete()
      .eq("user_id", userId);

    if (spotifyError) {
      console.error("Error deleting spotify integration:", spotifyError);
    }

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      throw new Error("Failed to delete account");
    }

    console.log("Account deleted successfully for:", username);

    // Send notification email if email is provided
    if (email) {
      try {
        const emailResponse = await resend.emails.send({
          from: "UserVault <noreply@uservault.cc>",
          to: [email],
          subject: "Your UserVault Account Has Been Deleted",
          html: `
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
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px;">
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
                            Account Deleted
                          </h2>
                          <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                            Your UserVault account <strong style="color: #ffffff;">@${username}</strong> has been permanently deleted by an administrator.
                          </p>
                          
                          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <p style="color: #ef4444; margin: 0; font-size: 14px; text-align: center; font-weight: 600;">
                              What has been deleted:
                            </p>
                            <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; margin: 16px 0 0 0; padding-left: 20px;">
                              <li>Your profile and all customizations</li>
                              <li>All badges and achievements</li>
                              <li>Social links and integrations</li>
                              <li>Analytics and view history</li>
                              <li>Account credentials</li>
                            </ul>
                          </div>
                          
                          <p style="color: #71717a; margin: 0; font-size: 14px; text-align: center;">
                            This action was taken due to a violation of our Terms of Service. If you believe this was done in error, please contact us.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding-top: 30px; text-align: center;">
                          <p style="color: #52525b; font-size: 12px; margin: 0;">
                            If you have questions, contact us at support@uservault.cc
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
          `,
        });

        console.log("Account deletion email sent:", emailResponse);
      } catch (emailError) {
        console.error("Error sending deletion email:", emailError);
        // Don't throw - account is already deleted
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted and user notified" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
