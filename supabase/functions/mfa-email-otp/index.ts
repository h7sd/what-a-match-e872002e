import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: max 3 email requests per 5 minutes per user
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory stores (resets on cold start)
const rateLimitStore = new Map<string, { requests: number; windowStart: number }>();
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

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
  return String(array[0] % 1000000).padStart(6, '0');
}

async function randomDelay(): Promise<void> {
  const delay = 200 + Math.random() * 300;
  await new Promise(resolve => setTimeout(resolve, delay));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'No email associated with account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'send') {
      // Check rate limit
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please wait a few minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate OTP
      const code = generateSecureCode();
      const expiresAt = Date.now() + CODE_EXPIRY_MS;
      
      otpStore.set(userId, { code, expiresAt, attempts: 0 });

      // Send email via Resend
      const resend = new Resend(resendApiKey);
      
      // Mask email for display
      const [localPart, domain] = userEmail.split('@');
      const maskedEmail = localPart.length > 2 
        ? `${localPart.slice(0, 2)}***@${domain}`
        : `***@${domain}`;

      const { error: emailError } = await resend.emails.send({
        from: 'UserVault Security <noreply@uservault.cc>',
        to: [userEmail],
        subject: 'Your Login Verification Code',
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
                  <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #111111; border-radius: 16px; border: 1px solid #222222; overflow: hidden;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 40px 40px 24px 40px;">
                        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #00D9A5, #00B4D8); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                          <span style="color: #0a0a0a; font-size: 28px; font-weight: bold;">UV</span>
                        </div>
                        <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Login Verification Code</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 24px 40px;">
                        <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                          Use this code to complete your login. It expires in 10 minutes.
                        </p>
                        
                        <!-- Code Box -->
                        <div style="background-color: #1a1a1a; border: 1px solid #333333; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                          <span style="color: #00D9A5; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${code}</span>
                        </div>
                        
                        <p style="color: #666666; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                          If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; border-top: 1px solid #222222;">
                        <p style="color: #444444; font-size: 12px; margin: 0; text-align: center;">
                          UserVault Security • This is an automated message
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

      if (emailError) {
        console.error('Email send error:', emailError);
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`MFA email OTP sent to user: ${userId.slice(0, 8)}...`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          maskedEmail,
          expiresIn: CODE_EXPIRY_MS / 1000 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { code } = await req.json();

      // Validate code format
      if (!code || !/^\d{6}$/.test(code)) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Invalid code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otpEntry = otpStore.get(userId);

      if (!otpEntry) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'No code found. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (Date.now() > otpEntry.expiresAt) {
        otpStore.delete(userId);
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Code expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check attempts
      if (otpEntry.attempts >= MAX_VERIFY_ATTEMPTS) {
        otpStore.delete(userId);
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Too many attempts. Please request a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment attempts
      otpEntry.attempts++;

      // Verify code using constant-time comparison
      let isValid = true;
      if (code.length !== otpEntry.code.length) {
        isValid = false;
      } else {
        for (let i = 0; i < code.length; i++) {
          if (code[i] !== otpEntry.code[i]) {
            isValid = false;
          }
        }
      }

      if (!isValid) {
        await randomDelay();
        return new Response(
          JSON.stringify({ 
            error: 'Invalid code', 
            attemptsRemaining: MAX_VERIFY_ATTEMPTS - otpEntry.attempts 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success - delete OTP
      otpStore.delete(userId);
      console.log(`MFA email OTP verified for user: ${userId.slice(0, 8)}...`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MFA email OTP error:', error);
    await randomDelay();
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
