import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
        from: "UserVault <noreply@uservault.app>",
        to: [user.email!],
        subject: "Confirm Account Deletion - UserVault",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #ff4444; margin-bottom: 24px;">⚠️ Account Deletion Request</h1>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You requested to delete your UserVault account. This action is <strong>permanent</strong> and cannot be undone.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your verification code is:
            </p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${deleteCode}</code>
            </div>
            <p style="color: #666; font-size: 14px;">
              This code expires in 15 minutes.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you did not request this, please ignore this email and secure your account.
            </p>
          </div>
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
