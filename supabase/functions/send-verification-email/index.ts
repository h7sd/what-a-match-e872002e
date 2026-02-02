import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAILS_PER_IP = 10;

const ipRequests = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipRequests.entries()) {
    if (value.resetTime <= now) ipRequests.delete(key);
  }
}, 60 * 1000);

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRequests.get(ip);

  if (!record || record.resetTime <= now) {
    ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_EMAILS_PER_IP - 1 };
  }

  if (record.count >= MAX_EMAILS_PER_IP) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  ipRequests.set(ip, record);
  return { allowed: true, remaining: MAX_EMAILS_PER_IP - record.count };
}

interface VerificationRequest {
  email: string;
  code: string;
  type: "signup" | "email_change";
}

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  // Check rate limit
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
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

  try {
    const { email, code, type }: VerificationRequest = await req.json();

    if (!email || !code) {
      throw new Error("Missing required fields");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Invalid code format");
    }

    const subject = type === "email_change" 
      ? "Confirm your new email address - UserVault"
      : "Verify your email address - UserVault";

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
                      ${type === "email_change" ? "Confirm New Email" : "Verify Your Email"}
                    </h2>
                    <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                      ${type === "email_change" 
                        ? "Enter this code to confirm your new email address:" 
                        : "Welcome to UserVault! Enter this code to verify your email:"}
                    </p>
                    
                    <!-- Code Box -->
                    <div style="background: rgba(139, 92, 246, 0.15); border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                      <span style="color: #a855f7; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', Monaco, monospace;">${code}</span>
                    </div>
                    
                    <p style="color: #71717a; margin: 0; font-size: 14px; text-align: center;">
                      This code is valid for <strong style="color: #a1a1aa;">15 minutes</strong>.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
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
    `;

    await sendEmail(email, subject, html);
    console.log("Verification email sent");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        ...corsHeaders 
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
