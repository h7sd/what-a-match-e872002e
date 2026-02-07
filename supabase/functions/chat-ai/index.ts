import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_MESSAGES_PER_CONVERSATION = 30; // per hour
const MAX_MESSAGES_PER_IP = 100; // per hour
const MAX_CONCURRENT_STREAMS = 50; // global limit

// In-memory stores
const conversationCounts = new Map<string, { count: number; resetTime: number }>();
const ipCounts = new Map<string, { count: number; resetTime: number }>();
let activeStreams = 0;

function checkAndUpdateLimit(
  key: string, 
  store: Map<string, { count: number; resetTime: number }>, 
  maxRequests: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = store.get(key);

  // Reset if window expired
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

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of conversationCounts.entries()) {
    if (value.resetTime <= now) conversationCounts.delete(key);
  }
  for (const [key, value] of ipCounts.entries()) {
    if (value.resetTime <= now) ipCounts.delete(key);
  }
}, 60 * 1000); // Cleanup every minute

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  try {
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check global concurrent stream limit
    if (activeStreams >= MAX_CONCURRENT_STREAMS) {
      console.log("Global stream limit reached");
      return new Response(
        JSON.stringify({ error: "Service is busy. Please try again in a moment." }),
        { 
          status: 503, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "30"
          } 
        }
      );
    }

    // Check IP rate limit
    const ipCheck = checkAndUpdateLimit(clientIp, ipCounts, MAX_MESSAGES_PER_IP);
    if (!ipCheck.allowed) {
      console.log("IP rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600",
            "X-RateLimit-Remaining": "0"
          } 
        }
      );
    }

    // Check conversation rate limit (if conversationId provided)
    if (conversationId) {
      const convCheck = checkAndUpdateLimit(conversationId, conversationCounts, MAX_MESSAGES_PER_CONVERSATION);
      if (!convCheck.allowed) {
        console.log("Conversation rate limit exceeded:", conversationId);
        return new Response(
          JSON.stringify({ error: "This conversation has reached its message limit. Please start a new chat or wait an hour." }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": "3600",
              "X-RateLimit-Remaining": "0"
            } 
          }
        );
      }
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

    // Track active stream
    activeStreams++;

    try {
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
        activeStreams--;
        
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

      // Create a transform stream to track when streaming ends
      const { readable, writable } = new TransformStream();
      
      (async () => {
        const reader = response.body!.getReader();
        const writer = writable.getWriter();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        } finally {
          await writer.close();
          activeStreams--;
        }
      })();

      return new Response(readable, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "X-RateLimit-Remaining": String(ipCheck.remaining)
        },
      });
    } catch (streamError) {
      activeStreams--;
      throw streamError;
    }
  } catch (error) {
    console.error("Chat AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
