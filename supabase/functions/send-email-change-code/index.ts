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
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }
  
  return res.json();
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    
    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { newEmail } = await req.json();

    if (!newEmail) {
      throw new Error("Missing new email address");
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const emailInUse = existingUser.users.some(u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user.id);
    
    if (emailInUse) {
      throw new Error("This email is already in use");
    }

    const currentEmail = user.email;
    if (!currentEmail) {
      throw new Error("No current email found");
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the code with the new email in metadata
    const { error: codeError } = await supabaseClient
      .from('verification_codes')
      .insert({
        email: currentEmail,
        code: code,
        type: 'email_change',
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      console.error("Error storing verification code:", codeError);
      throw new Error("Failed to generate verification code");
    }

    // Send verification email to OLD email
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
                        <td align="center" style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 16px;">
                          <span style="color: white; font-weight: bold; font-size: 24px; line-height: 60px;">UV</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: 700; text-align: center;">UserVault</h1>
                  </td>
                </tr>
                
                <!-- Main Card -->
                <tr>
                  <td style="background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 20px; padding: 40px;">
                    <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
                      Email Change Request
                    </h2>
                    <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                      Someone requested to change your email address to:<br>
                      <strong style="color: #8b5cf6;">${newEmail}</strong>
                    </p>
                    
                    <!-- Code Display -->
                    <div style="text-align: center; margin: 30px 0;">
                      <div style="display: inline-block; background: rgba(139, 92, 246, 0.2); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 12px; padding: 20px 40px;">
                        <span style="color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
                      </div>
                    </div>
                    
                    <p style="color: #71717a; margin: 0 0 20px 0; font-size: 14px; text-align: center;">
                      This code is valid for <strong style="color: #a1a1aa;">15 minutes</strong>.
                    </p>
                    
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                      <p style="color: #ef4444; font-size: 13px; margin: 0; text-align: center;">
                        ⚠️ If you didn't request this change, please ignore this email and secure your account.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding-top: 30px; text-align: center;">
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

    await sendEmail(currentEmail, "Email Change Verification - UserVault", html);

    console.log("Email change verification code sent to:", currentEmail);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in email change code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
