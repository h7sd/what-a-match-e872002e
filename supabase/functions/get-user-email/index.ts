import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Aggressive rate limiting
const rateLimitMap = new Map<string, { 
  count: number; 
  resetTime: number; 
  failedAttempts: number;
  lockedUntil: number;
}>();

const RATE_LIMIT = 3; // Only 3 requests per minute
const RATE_WINDOW_MS = 60 * 1000;
const LOCKOUT_THRESHOLD = 5; // 5 failed attempts = lockout
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour lockout

// Track by username to prevent targeted enumeration
const usernameAttempts = new Map<string, { count: number; resetTime: number }>();
const USERNAME_LIMIT = 2; // Only 2 attempts per username per 10 minutes
const USERNAME_WINDOW_MS = 10 * 60 * 1000;

// Create a simple hash of the IP for logging (privacy)
function hashIP(ip: string): string {
  // Simple hash for logging purposes only
  let hash = 0;
  const str = ip + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 10) || "salt");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  
  // Initialize record if doesn't exist
  if (!record) {
    record = { count: 0, resetTime: now + RATE_WINDOW_MS, failedAttempts: 0, lockedUntil: 0 };
    rateLimitMap.set(ip, record);
  }
  
  // Check if locked out
  if (record.lockedUntil > now) {
    return { allowed: false, reason: "locked" };
  }
  
  // Reset window if expired
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_WINDOW_MS;
  }
  
  // Check rate limit
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, reason: "rate_limit" };
  }
  
  record.count++;
  return { allowed: true };
}

function recordFailure(ip: string): void {
  const record = rateLimitMap.get(ip);
  if (record) {
    record.failedAttempts++;
    if (record.failedAttempts >= LOCKOUT_THRESHOLD) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      console.warn(`IP ${hashIP(ip)} locked out for 1 hour after ${record.failedAttempts} failures`);
    }
  }
}

function checkUsernameLimit(username: string): boolean {
  const now = Date.now();
  const record = usernameAttempts.get(username);
  
  if (!record || now > record.resetTime) {
    usernameAttempts.set(username, { count: 1, resetTime: now + USERNAME_WINDOW_MS });
    return true;
  }
  
  if (record.count >= USERNAME_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Random delay to prevent timing attacks
async function randomDelay(): Promise<void> {
  const delay = 200 + Math.random() * 300; // 200-500ms
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Mask email for display: john.doe@gmail.com -> j*****e@g***l.com
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***.***';
  
  const maskedLocal = localPart.length <= 2 
    ? '*'.repeat(localPart.length)
    : localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1];
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, index) => {
    if (index === domainParts.length - 1) return part;
    if (part.length <= 2) return '*'.repeat(part.length);
    return part[0] + '*'.repeat(Math.min(part.length - 2, 3)) + part[part.length - 1];
  }).join('.');
  
  return `${maskedLocal}@${maskedDomain}`;
}

// Simple XOR obfuscation with timestamp (not encryption, just obfuscation)
// This makes it harder to use automated tools but still allows client to decode
function obfuscateEmail(email: string, timestamp: number): string {
  const key = timestamp.toString(36);
  let result = '';
  for (let i = 0; i < email.length; i++) {
    result += String.fromCharCode(email.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    // Check rate limits
    const rateCheck = checkRateLimit(clientIp);
    
    if (!rateCheck.allowed) {
      console.warn(`Blocked request from ${hashIP(clientIp)}: ${rateCheck.reason}`);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: rateCheck.reason === "locked" 
          ? "Account temporarily locked. Try again later." 
          : "Too many requests. Please wait." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedUsername = username.toLowerCase().trim();
    
    // Validate format
    if (normalizedUsername.length === 0 || normalizedUsername.length > 30 || !/^[a-z0-9_.-]+$/.test(normalizedUsername)) {
      recordFailure(clientIp);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check username-specific rate limit
    if (!checkUsernameLimit(normalizedUsername)) {
      recordFailure(clientIp);
      console.warn(`Username ${normalizedUsername} rate limited`);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lookup profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .or(`username.ilike.${normalizedUsername},alias_username.ilike.${normalizedUsername}`)
      .limit(1)
      .maybeSingle();

    // Generic error for any failure - prevents enumeration
    if (profileError || !profile) {
      recordFailure(clientIp);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email
    const { data: { user }, error } = await supabase.auth.admin.getUserById(profile.user_id);

    if (error || !user?.email) {
      recordFailure(clientIp);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return obfuscated email with timestamp for client-side decoding
    // This is NOT security through obscurity - the rate limiting is the real protection
    // This just makes automated scraping slightly harder
    const timestamp = Date.now();
    const obfuscated = obfuscateEmail(user.email, timestamp);
    const masked = maskEmail(user.email);

    await randomDelay();
    
    return new Response(
      JSON.stringify({ 
        d: obfuscated, // Obfuscated data
        t: timestamp,  // Timestamp for decoding
        m: masked      // Masked version for display
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    await randomDelay();
    return new Response(
      JSON.stringify({ error: "Request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
