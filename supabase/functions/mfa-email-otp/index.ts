import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: max 3 email requests per 5 minutes per user
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory rate limit store (resets on cold start)
const rateLimitStore = new Map<string, { requests: number; windowStart: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.windowStart + RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { requests: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.requests++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.requests };
}

function generateSecureCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, "0");
}

async function randomDelay(): Promise<void> {
  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***";
  return localPart.length > 2 ? `${localPart.slice(0, 2)}***@${domain}` : `***@${domain}`;
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend credentials not configured");
    }

    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    // Authed client to resolve the current user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = (userData.user.email || "").toLowerCase().trim();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email associated with account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (action !== "send" && action !== "verify") {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for writing/reading verification_codes (bypass RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "send") {
      const rate = checkRateLimit(userId);
      if (!rate.allowed) {
        await randomDelay();
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a few minutes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const otpCode = generateSecureCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS).toISOString();

      const { error: insertError } = await admin.from("verification_codes").insert({
        email: userEmail,
        code: otpCode,
        type: "mfa_email",
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Failed to insert MFA email code:", insertError);
        await randomDelay();
        return new Response(JSON.stringify({ error: "Failed to create code" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resend = new Resend(RESEND_API_KEY);
      const maskedEmail = maskEmail(userEmail);

      const { error: emailError } = await resend.emails.send({
        from: "UserVault Security <noreply@uservault.cc>",
        to: [userEmail],
        subject: "Your Login Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
                  <tr><td align="center" style="padding:36px 40px 18px;">
                    <div style="width:64px;height:64px;background:linear-gradient(135deg,#00D9A5,#00B4D8);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                      <span style="color:#0a0a0a;font-size:28px;font-weight:800;">UV</span>
                    </div>
                    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">Login Verification Code</h1>
                  </td></tr>
                  <tr><td style="padding:0 40px 24px;">
                    <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 18px;text-align:center;">
                      Use this code to complete your login. It expires in 10 minutes.
                    </p>
                    <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:22px;text-align:center;margin-bottom:18px;">
                      <span style="color:#00D9A5;font-size:34px;font-weight:800;letter-spacing:8px;font-family:monospace;">${otpCode}</span>
                    </div>
                    <p style="color:#666;font-size:12px;line-height:1.5;margin:0;text-align:center;">
                      If you didn't request this code, you can ignore this email.
                    </p>
                  </td></tr>
                  <tr><td style="padding:18px 40px;border-top:1px solid #222;">
                    <p style="color:#444;font-size:12px;margin:0;text-align:center;">UserVault Security • Automated message</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        await randomDelay();
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, maskedEmail, expiresIn: CODE_EXPIRY_MS / 1000 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // verify
    if (!/^\d{6}$/.test(code)) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: codes, error: fetchError } = await admin
      .from("verification_codes")
      .select("*")
      .eq("email", userEmail)
      .eq("code", code)
      .eq("type", "mfa_email")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !codes || codes.length === 0) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark used
    await admin
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codes[0].id);

    await randomDelay();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MFA email OTP error:", error);
    await randomDelay();
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
