import { serve } from "jsr:@std/http@1/server";
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

interface DeleteAccountRequest {
  action: "send-code" | "verify-and-delete";
  email?: string;
  code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, email, code }: DeleteAccountRequest = await req.json();

    if (action === "send-code") {
      // Generate 6-digit code
      const deleteCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store code in verification_codes table
      const { error: insertError } = await supabaseAdmin
        .from("verification_codes")
        .insert({
          email: user.email,
          code: deleteCode,
          type: "account_deletion",
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error inserting code:", insertError);
        throw new Error("Failed to generate verification code");
      }

      // Send email with code
      const emailResponse = await resend.emails.send({
        from: "UserVault <noreply@uservault.cc>",
        to: [user.email!],
        subject: "Confirm Account Deletion - UserVault",
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
                          ⚠️ Account Deletion
                        </h2>
                        <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                          You requested to delete your account. This action is <strong style="color: #ef4444;">permanent</strong> and cannot be undone.
                        </p>
                        
                        <!-- Code Box -->
                        <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                          <span style="color: #ef4444; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', Monaco, monospace;">${deleteCode}</span>
                        </div>
                        
                        <p style="color: #71717a; margin: 0; font-size: 14px; text-align: center;">
                          This code expires in <strong style="color: #a1a1aa;">15 minutes</strong>.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding-top: 30px; text-align: center;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                          If you didn't request this, please secure your account immediately.
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

      console.log("Deletion code email sent:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "verify-and-delete") {
      if (!code) {
        throw new Error("Verification code required");
      }

      // Verify code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("verification_codes")
        .select("*")
        .eq("email", user.email)
        .eq("code", code)
        .eq("type", "account_deletion")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        throw new Error("Invalid or expired verification code");
      }

      // Mark code as used
      await supabaseAdmin
        .from("verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", codeData.id);

      // Delete user's profile (cascades to related data)
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Error deleting profile:", profileError);
      }

      // Delete user's badges
      const { error: badgesError } = await supabaseAdmin
        .from("user_badges")
        .delete()
        .eq("user_id", user.id);

      if (badgesError) {
        console.error("Error deleting badges:", badgesError);
      }

      // Delete user's roles
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Error deleting roles:", rolesError);
      }

      // Delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        throw new Error("Failed to delete account");
      }

      console.log("Account deleted successfully for:", user.email);

      return new Response(
        JSON.stringify({ success: true, message: "Account deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error in delete-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
