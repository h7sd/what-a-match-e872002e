import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_BAN_APPEAL_WEBHOOK = Deno.env.get("DISCORD_BAN_APPEAL_WEBHOOK");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration - strict for appeals
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_APPEALS_PER_IP = 3; // max 3 appeals per IP per day

const ipAppeals = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipAppeals.entries()) {
    if (value.resetTime <= now) ipAppeals.delete(key);
  }
}, 60 * 60 * 1000); // Cleanup every hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipAppeals.get(ip);

  if (!record || record.resetTime <= now) {
    ipAppeals.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_APPEALS_PER_IP - 1 };
  }

  if (record.count >= MAX_APPEALS_PER_IP) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  ipAppeals.set(ip, record);
  return { allowed: true, remaining: MAX_APPEALS_PER_IP - record.count };
}

// Sanitize text for Discord to prevent mention injection
function sanitizeForDiscord(text: string): string {
  return text
    .replace(/@everyone/gi, '@\u200Beveryone')
    .replace(/@here/gi, '@\u200Bhere')
    .replace(/<@[!&]?\d+>/g, '[mention]')
    .replace(/<#\d+>/g, '[channel]');
}

async function sendDiscordWebhook(username: string, reason: string, appealText: string) {
  if (!DISCORD_BAN_APPEAL_WEBHOOK) {
    console.log("No Discord webhook configured for ban appeals");
    return;
  }

  try {
    const embed = {
      title: "🔔 New Ban Appeal",
      color: 0xFFA500, // Orange
      fields: [
        {
          name: "Username",
          value: sanitizeForDiscord(username || "Unknown"),
          inline: true,
        },
        {
          name: "Original Ban Reason",
          value: sanitizeForDiscord(reason || "No reason provided").slice(0, 1024),
          inline: false,
        },
        {
          name: "Appeal Text",
          value: sanitizeForDiscord(appealText.length > 1000 ? appealText.substring(0, 997) + "..." : appealText),
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(DISCORD_BAN_APPEAL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "<@&1464309170768707824> <@&1464368447294013575> <@&1464317371719352548> <@&1464309176401657877> <@&1464325907471798314> New ban appeal submitted!",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error("Failed to send Discord webhook:", await response.text());
    } else {
      console.log("Discord webhook sent successfully");
    }
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
  }
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
      JSON.stringify({ error: "Too many appeals submitted. Please try again later." }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json", 
          "Retry-After": "86400",
          ...corsHeaders 
        } 
      }
    );
  }

  try {
    const { userId, appealText } = await req.json();

    if (!userId || !appealText) {
      throw new Error("Missing user ID or appeal text");
    }

    if (appealText.trim().length < 10) {
      throw new Error("Appeal text must be at least 10 characters");
    }

    if (appealText.length > 2000) {
      throw new Error("Appeal text must be less than 2000 characters");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is banned - only get minimal fields needed
    const { data: banRecord, error: banError } = await supabaseClient
      .from('banned_users')
      .select('username, reason, appeal_submitted_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (banError || !banRecord) {
      throw new Error("No ban record found");
    }

    // Check if already appealed
    if (banRecord.appeal_submitted_at) {
      throw new Error("You have already submitted an appeal");
    }

    // Submit the appeal
    const { error: updateError } = await supabaseClient
      .from('banned_users')
      .update({
        appeal_text: appealText.trim(),
        appeal_submitted_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error submitting appeal:", updateError);
      throw new Error("Failed to submit appeal");
    }

    console.log("Appeal submitted successfully");

    // Send Discord webhook notification with minimal data
    await sendDiscordWebhook(banRecord.username, banRecord.reason || "", appealText.trim());

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        ...corsHeaders 
      },
    });
  } catch (error: any) {
    console.error("Error submitting appeal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
