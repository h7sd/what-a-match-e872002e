import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: max 5 MFA attempts per 5 minutes per user
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lockout after max attempts

// In-memory store (resets on cold start, but provides basic protection)
const rateLimitStore = new Map<string, { attempts: number; windowStart: number; lockedUntil?: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Check if locked out
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { 
      allowed: false, 
      remaining: 0, 
      lockedUntil: entry.lockedUntil 
    };
  }

  // New window or expired
  if (!entry || now > entry.windowStart + RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { attempts: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Check if over limit
  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    // Lock out user
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { 
      allowed: false, 
      remaining: 0, 
      lockedUntil: entry.lockedUntil 
    };
  }

  entry.attempts++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - entry.attempts };
}

function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

// Random delay to prevent timing attacks (200-500ms)
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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const { action, factorId, code } = await req.json();

    // Validate action
    if (!['challenge', 'verify'].includes(action)) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For verify action, check rate limit
    if (action === 'verify') {
      const rateLimit = checkRateLimit(userId);
      
      if (!rateLimit.allowed) {
        const lockoutMinutes = rateLimit.lockedUntil 
          ? Math.ceil((rateLimit.lockedUntil - Date.now()) / 60000)
          : 15;
        
        console.log(`MFA rate limit exceeded for user: ${userId.slice(0, 8)}...`);
        
        await randomDelay();
        return new Response(
          JSON.stringify({ 
            error: 'Too many attempts', 
            lockoutMinutes,
            message: `Account temporarily locked. Try again in ${lockoutMinutes} minutes.`
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate factorId format (UUID)
    if (!factorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(factorId)) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the factor belongs to this user
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    
    if (factorsError) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Failed to verify factor ownership' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userFactor = factorsData.totp.find(f => f.id === factorId && f.status === 'verified');
    if (!userFactor) {
      console.log(`Invalid factor attempt for user: ${userId.slice(0, 8)}...`);
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Invalid factor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'challenge') {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Failed to create challenge' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ challengeId: challengeData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Validate code format (6 digits only)
      if (!code || !/^\d{6}$/.test(code)) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Invalid code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create fresh challenge for verification
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) {
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) {
        console.log(`Failed MFA attempt for user: ${userId.slice(0, 8)}...`);
        await randomDelay();
        return new Response(
          JSON.stringify({ error: 'Invalid code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success - reset rate limit
      resetRateLimit(userId);
      
      console.log(`Successful MFA verification for user: ${userId.slice(0, 8)}...`);

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
    console.error('MFA verify error:', error);
    await randomDelay();
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});