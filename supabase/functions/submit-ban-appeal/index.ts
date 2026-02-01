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

async function sendDiscordWebhook(banRecord: any, appealText: string) {
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
          value: banRecord.username || "Unknown",
          inline: true,
        },
        {
          name: "Email",
          value: banRecord.email || "Unknown",
          inline: true,
        },
        {
          name: "User ID",
          value: banRecord.user_id,
          inline: false,
        },
        {
          name: "Original Ban Reason",
          value: banRecord.reason || "No reason provided",
          inline: false,
        },
        {
          name: "Appeal Text",
          value: appealText.length > 1000 ? appealText.substring(0, 997) + "..." : appealText,
          inline: false,
        },
        {
          name: "Banned At",
          value: new Date(banRecord.banned_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
          inline: true,
        },
        {
          name: "Appeal Deadline",
          value: new Date(banRecord.appeal_deadline).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(DISCORD_BAN_APPEAL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "<@h9sd> <@qo5c> New ban appeal submitted!",
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

    // Check if user is banned
    const { data: banRecord, error: banError } = await supabaseClient
      .from('banned_users')
      .select('*')
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

    console.log("Appeal submitted for user:", userId);

    // Send Discord webhook notification
    await sendDiscordWebhook(banRecord, appealText.trim());

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
