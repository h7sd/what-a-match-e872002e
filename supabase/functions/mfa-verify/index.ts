import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: max 5 MFA attempts per 5 minutes per user
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const rateLimitStore = new Map<string, { attempts: number; windowStart: number; lockedUntil?: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  if (!entry || now > entry.windowStart + RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { attempts: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitStore.set(userId, entry);
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  entry.attempts++;
  rateLimitStore.set(userId, entry);
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - entry.attempts };
}

function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

async function randomDelay(): Promise<void> {
  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

Deno.serve(async (req) => {
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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Backend credentials not configured");
    }

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

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const factorId = body?.factorId;
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (action !== "challenge" && action !== "verify") {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!factorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(factorId)) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure factor belongs to user and is verified
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError || !factorsData) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Failed to list factors" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userFactor = factorsData.totp.find((f) => f.id === factorId && f.status === "verified");
    if (!userFactor) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid factor" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "challenge") {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challengeData?.id) {
        await randomDelay();
        return new Response(JSON.stringify({ error: "Failed to create challenge" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ challengeId: challengeData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // verify
    const rate = checkRateLimit(userId);
    if (!rate.allowed) {
      const lockoutMinutes = rate.lockedUntil ? Math.ceil((rate.lockedUntil - Date.now()) / 60000) : 15;
      await randomDelay();
      return new Response(
        JSON.stringify({
          error: "Too many attempts",
          lockoutMinutes,
          message: `Account temporarily locked. Try again in ${lockoutMinutes} minutes.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fresh challenge per verification
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData?.id) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      await randomDelay();
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    resetRateLimit(userId);
    await randomDelay();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MFA verify error:", error);
    await randomDelay();
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
