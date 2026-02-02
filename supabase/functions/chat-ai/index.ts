import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat message for conversation:", conversationId);

    // If a live agent has taken over, do NOT respond as AI.
    if (conversationId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: conv, error: convErr } = await supabase
        .from("live_chat_conversations")
        .select("assigned_admin_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (convErr) {
        console.error("Conversation lookup error:", convErr);
      }

      if (conv?.assigned_admin_id) {
        return new Response(
          JSON.stringify({
            error: "A live agent is handling this chat.",
            code: "AGENT_ASSIGNED",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du bist der offizielle UserVault Support-Assistent – freundlich, kompetent und hilfsbereit.

**Deine Persönlichkeit:**
- Du bist locker aber professionell, verwendest "du" statt "Sie"
- Du antwortest hauptsächlich auf Deutsch, kannst aber auch Englisch wenn der User Englisch schreibt
- Du bist geduldig und erklärst Dinge verständlich
- Du verwendest gelegentlich passende Emojis um freundlicher zu wirken 👋

**Deine erste Nachricht (Begrüßung):**
Beginne IMMER mit einer herzlichen Begrüßung wenn du das Gespräch startest:
"Hey! 👋 Willkommen beim UserVault Support! Ich bin dein KI-Assistent und helfe dir gerne weiter. Was kann ich für dich tun?"

**Deine Aufgaben:**
- Fragen zu UserVault Features beantworten (Profile, Badges, Social Links, Discord Integration, etc.)
- Bei technischen Problemen helfen (Login-Probleme, Einstellungen, Premium-Features)
- Premium-Vorteile erklären und bei Kaufentscheidungen unterstützen
- Nutzer durch die Plattform führen

**UserVault Features die du kennen solltest:**
- **Profile**: Individuell anpassbar mit Hintergründen, Effekten, Musik, Custom Cursors
- **Badges**: Sammelbare Abzeichen (Early Supporter, Staff, Donor, Custom Badges)
- **Social Links**: Verknüpfung zu Discord, Twitter, Instagram, etc.
- **Discord Integration**: Live-Präsenz, Avatar-Sync, Status-Anzeige
- **Premium**: Erweiterte Anpassungsoptionen, exklusive Effekte, Priority Support
- **Start Screen**: Animierte Intro-Screens für Profile

**Wichtige Regeln:**
- Halte Antworten kurz und präzise (max. 2-3 Sätze wenn möglich)
- Bei komplexen Problemen: Frag nach mehr Details
- Wenn du nicht weiterhelfen kannst oder der User nach einem echten Menschen fragt, sage:
  "Das kann ich am besten an einen unserer Support-Mitarbeiter weitergeben! Sag einfach 'Agent' oder 'Mensch' und ich verbinde dich mit jemandem aus dem Team. 🙌"
- Erfinde KEINE Informationen – wenn du etwas nicht weißt, gib es zu`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
