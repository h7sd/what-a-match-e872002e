import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationRequest {
  email: string;
  type: "signup" | "password_reset";
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CODES_PER_EMAIL = 5; // max codes per email per hour
const MAX_CODES_PER_IP = 10; // max codes per IP per hour

const emailCounts = new Map<string, { count: number; resetTime: number }>();
const ipCounts = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of emailCounts.entries()) {
    if (value.resetTime <= now) emailCounts.delete(key);
  }
  for (const [key, value] of ipCounts.entries()) {
    if (value.resetTime <= now) ipCounts.delete(key);
  }
}, 60 * 1000);

function checkRateLimit(key: string, store: Map<string, { count: number; resetTime: number }>, maxRequests: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetTime <= now) {
    store.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  store.set(key, record);
  return { allowed: true, remaining: maxRequests - record.count };
}

// Add timing jitter to prevent user enumeration
const addTimingJitter = async () => {
  const delay = 200 + Math.random() * 300;
  await new Promise(resolve => setTimeout(resolve, delay));
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSignupEmail(to: string, code: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "UserVault <noreply@uservault.cc>",
      to: [to],
      subject: "Verify Your Email - UserVault",
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
                  <tr>
                    <td style="background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 20px; padding: 40px;">
                      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
                        Verify Your Email
                      </h2>
                      <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                        Enter this code to complete your signup:
                      </p>
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 32px; letter-spacing: 8px;">
                          ${code}
                        </span>
                      </div>
                      <p style="color: #71717a; margin: 0; font-size: 14px; text-align: center;">
                        This code expires in <strong style="color: #a1a1aa;">15 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #52525b; font-size: 12px; margin: 0;">
                        If you didn't request this email, you can safely ignore it.
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
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

async function sendPasswordResetEmail(to: string, code: string, resetUrl: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "UserVault <noreply@uservault.cc>",
      to: [to],
      subject: "Reset Your Password - UserVault",
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
                  <tr>
                    <td style="background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0.8) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 20px; padding: 40px;">
                      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; text-align: center;">
                        Reset Your Password
                      </h2>
                      <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                        Click the button below to reset your password:
                      </p>
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                          Reset Password
                        </a>
                      </div>
                      <p style="color: #71717a; margin: 0 0 20px 0; font-size: 14px; text-align: center;">
                        This link is valid for <strong style="color: #a1a1aa;">1 hour</strong>.
                      </p>
                      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                        <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
                          If the button doesn't work, copy this link:<br>
                          <a href="${resetUrl}" style="color: #8b5cf6; word-break: break-all;">${resetUrl}</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #52525b; font-size: 12px; margin: 0;">
                        If you didn't request this email, you can safely ignore it.
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
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP (prefer Cloudflare header when behind proxy)
  const cfIp = req.headers.get('cf-connecting-ip');
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const xClientIp = req.headers.get('x-client-ip');
  const clientIp = cfIp || forwardedFor?.split(',')[0]?.trim() || realIp || xClientIp || 'unknown';

  try {
    const { email, type }: VerificationRequest = await req.json();

    if (!email || !type) {
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type !== "signup" && type !== "password_reset") {
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check IP rate limit
    const ipCheck = checkRateLimit(clientIp, ipCounts, MAX_CODES_PER_IP);
    if (!ipCheck.allowed) {
      console.log("IP rate limit exceeded for code generation");
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "3600",
            ...corsHeaders 
          } 
        }
      );
    }

    // Check email rate limit
    const emailCheck = checkRateLimit(normalizedEmail, emailCounts, MAX_CODES_PER_EMAIL);
    if (!emailCheck.allowed) {
      console.log("Email rate limit exceeded for code generation");
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Too many verification codes requested for this email. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "3600",
            ...corsHeaders 
          } 
        }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const code = generateCode();
    const expiresAt = type === "signup" 
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      : new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Insert verification code using service role
    const { error: insertError } = await supabaseAdmin
      .from("verification_codes")
      .insert({
        email: normalizedEmail,
        code,
        type,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send appropriate email
    if (type === "signup") {
      await sendSignupEmail(normalizedEmail, code);
      console.log("Signup verification code generated");
    } else {
      // Get origin from request headers for reset URL
      const origin = req.headers.get("origin") || "https://uservault.cc";
      const resetUrl = `${origin}/auth?type=recovery&email=${encodeURIComponent(normalizedEmail)}&code=${code}`;
      await sendPasswordResetEmail(normalizedEmail, code, resetUrl);
      console.log("Password reset code generated");
    }

    await addTimingJitter();
    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in generate-verification-code:", error);
    await addTimingJitter();
    return new Response(
      JSON.stringify({ error: "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
