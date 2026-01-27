import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ReportBody = {
  username?: unknown;
  reason?: unknown;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const webhookUrl = Deno.env.get("VITE_DISCORD_REPORT_WEBHOOK");
    if (!webhookUrl) {
      console.error("VITE_DISCORD_REPORT_WEBHOOK not configured");
      return json(500, { error: "Report system not configured" });
    }

    const body = (await req.json()) as ReportBody;
    const username = safeString(body.username).trim();
    const reason = safeString(body.reason).trim();

    if (!username) return json(400, { error: "username is required" });
    if (!reason) return json(400, { error: "reason is required" });

    // Basic length limits to prevent abuse
    if (username.length > 64) return json(400, { error: "username too long" });
    if (reason.length > 1500) return json(400, { error: "reason too long" });

    const userAgent = req.headers.get("user-agent") || "unknown";
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
              { name: "Reported User", value: `@${username}`, inline: true },
              { name: "Reason", value: reason },
              { name: "User-Agent", value: userAgent.slice(0, 256) },
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

    return json(200, { ok: true });
  } catch (error) {
    console.error("report-user error", error);
    return json(500, { error: "Internal server error" });
  }
});
