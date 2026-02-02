import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REPORTS_PER_IP = 10; // max 10 reports per IP per hour
const MAX_REPORTS_PER_USER = 5; // max 5 reports per user per hour

const ipReports = new Map<string, { count: number; resetTime: number }>();
const userReports = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipReports.entries()) {
    if (value.resetTime <= now) ipReports.delete(key);
  }
  for (const [key, value] of userReports.entries()) {
    if (value.resetTime <= now) userReports.delete(key);
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

type ReportBody = {
  username?: unknown;
  reason?: unknown;
};

function json(status: number, body: unknown, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

// Sanitize Discord mentions and markdown to prevent abuse
function sanitizeForDiscord(text: string): string {
  return text
    // Escape @everyone and @here mentions (insert zero-width space)
    .replace(/@everyone/gi, '@\u200Beveryone')
    .replace(/@here/gi, '@\u200Bhere')
    // Escape user/role mentions like <@123456789> or <@&123456789>
    .replace(/<@[!&]?\d+>/g, '[mention]')
    // Escape channel mentions like <#123456789>
    .replace(/<#\d+>/g, '[channel]')
    // Escape Discord markdown characters
    .replace(/[*_~`|]/g, '\\$&')
    // Remove any potential embed links
    .replace(/\[.*?\]\(.*?\)/g, '[link removed]');
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Get client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  // Check IP rate limit
  const ipCheck = checkRateLimit(clientIp, ipReports, MAX_REPORTS_PER_IP);
  if (!ipCheck.allowed) {
    return json(429, { error: "Too many reports. Please try again later." }, { "Retry-After": "3600" });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: "Authentication required to submit reports" });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Auth verification failed:', claimsError);
      return json(401, { error: "Invalid authentication" });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string | undefined;

    // Check user rate limit
    const userCheck = checkRateLimit(userId, userReports, MAX_REPORTS_PER_USER);
    if (!userCheck.allowed) {
      return json(429, { error: "You have submitted too many reports. Please try again later." }, { "Retry-After": "3600" });
    }

    const webhookUrl = Deno.env.get("VITE_DISCORD_REPORT_WEBHOOK");
    if (!webhookUrl) {
      console.error("VITE_DISCORD_REPORT_WEBHOOK not configured");
      return json(500, { error: "Report system not configured" });
    }

    const body = (await req.json()) as ReportBody;
    const rawUsername = safeString(body.username).trim();
    const rawReason = safeString(body.reason).trim();

    if (!rawUsername) return json(400, { error: "username is required" });
    if (!rawReason) return json(400, { error: "reason is required" });

    // Basic length limits to prevent abuse
    if (rawUsername.length > 64) return json(400, { error: "username too long" });
    if (rawReason.length > 1500) return json(400, { error: "reason too long" });

    // Sanitize inputs to prevent Discord markdown/mention injection
    const username = sanitizeForDiscord(rawUsername);
    const reason = sanitizeForDiscord(rawReason);

    const now = new Date().toISOString();

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "User Report",
            color: 0xff0000,
            fields: [
              { name: "Reported User", value: username, inline: true },
              { name: "Reason", value: reason.slice(0, 1024) },
            ],
            timestamp: now,
          },
        ],
      }),
    });

    // consume body for Deno
    const respText = await discordResponse.text();

    if (!discordResponse.ok) {
      console.error("Discord webhook failed", {
        status: discordResponse.status,
        body: respText?.slice(0, 500),
      });
      return json(502, { error: "Webhook failed", status: discordResponse.status });
    }

    console.log(`Report submitted for user @${rawUsername}`);
    return json(200, { ok: true }, { "X-RateLimit-Remaining": String(userCheck.remaining) });
  } catch (error) {
    console.error("report-user error", error);
    return json(500, { error: "Internal server error" });
  }
});
