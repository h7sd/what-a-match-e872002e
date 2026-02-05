import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  email: string;
  code: string;
  type: "signup" | "password_reset";
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS_PER_IP = 5;
const MAX_ATTEMPTS_PER_EMAIL = 10;
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limiting stores
const ipAttempts = new Map<string, { count: number; firstAttempt: number; locked: boolean; lockUntil: number }>();
const emailAttempts = new Map<string, { count: number; firstAttempt: number; locked: boolean; lockUntil: number }>();

// Hash function for privacy
async function hashForLogging(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Add random delay to prevent timing attacks
const addTimingJitter = async () => {
  const delay = 200 + Math.random() * 300;
  await new Promise(resolve => setTimeout(resolve, delay));
};

function checkRateLimit(key: string, store: Map<string, { count: number; firstAttempt: number; locked: boolean; lockUntil: number }>, maxAttempts: number): { allowed: boolean; remaining: number; lockedOut: boolean } {
  const now = Date.now();
  const record = store.get(key);

  // Check if locked out
  if (record?.locked && record.lockUntil > now) {
    return { allowed: false, remaining: 0, lockedOut: true };
  }

  // Clear lockout if expired
  if (record?.locked && record.lockUntil <= now) {
    store.delete(key);
    return { allowed: true, remaining: maxAttempts, lockedOut: false };
  }

  // Reset window if expired
  if (record && (now - record.firstAttempt) > RATE_LIMIT_WINDOW_MS) {
    store.delete(key);
    return { allowed: true, remaining: maxAttempts, lockedOut: false };
  }

  if (!record) {
    return { allowed: true, remaining: maxAttempts, lockedOut: false };
  }

  const remaining = maxAttempts - record.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), lockedOut: false };
}

function recordAttempt(key: string, store: Map<string, { count: number; firstAttempt: number; locked: boolean; lockUntil: number }>, failed: boolean): void {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    store.set(key, { count: 1, firstAttempt: now, locked: false, lockUntil: 0 });
    return;
  }

  record.count++;

  // Lock out after too many failed attempts
  if (failed && record.count >= LOCKOUT_THRESHOLD) {
    record.locked = true;
    record.lockUntil = now + LOCKOUT_DURATION_MS;
  }

  store.set(key, record);
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
    const { email, code, type }: VerifyRequest = await req.json();

    if (!email || !code || !type) {
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = await hashForLogging(normalizedEmail);
    const ipHash = await hashForLogging(clientIp);

    // Check IP rate limit
    const ipCheck = checkRateLimit(clientIp, ipAttempts, MAX_ATTEMPTS_PER_IP);
    if (!ipCheck.allowed) {
      console.log(`Rate limit exceeded for IP hash: ${ipHash}`);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ 
          error: ipCheck.lockedOut 
            ? "Too many failed attempts. Please try again later." 
            : "Rate limit exceeded. Please wait before trying again." 
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "300",
            ...corsHeaders 
          } 
        }
      );
    }

    // Check email rate limit
    const emailCheck = checkRateLimit(normalizedEmail, emailAttempts, MAX_ATTEMPTS_PER_EMAIL);
    if (!emailCheck.allowed) {
      console.log(`Rate limit exceeded for email hash: ${emailHash}`);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ 
          error: emailCheck.lockedOut 
            ? "Too many failed attempts. Please request a new code." 
            : "Rate limit exceeded. Please wait before trying again." 
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "300",
            ...corsHeaders 
          } 
        }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      recordAttempt(clientIp, ipAttempts, true);
      recordAttempt(normalizedEmail, emailAttempts, true);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid code format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the code
    const { data: codes, error: fetchError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", code)
      .eq("type", type)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !codes || codes.length === 0) {
      recordAttempt(clientIp, ipAttempts, true);
      recordAttempt(normalizedEmail, emailAttempts, true);
      console.log(`Code verification failed for email hash: ${emailHash}`);
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Invalid or expired code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codes[0].id);

    if (updateError) {
      console.error("Error marking code as used:", updateError);
    }

    // Record successful attempt (clears failed count)
    recordAttempt(clientIp, ipAttempts, false);
    recordAttempt(normalizedEmail, emailAttempts, false);

    console.log(`Code verified successfully for email hash: ${emailHash} (type: ${type})`);
    await addTimingJitter();

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code:", error);
    await addTimingJitter();
    return new Response(
      JSON.stringify({ error: "Verification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
