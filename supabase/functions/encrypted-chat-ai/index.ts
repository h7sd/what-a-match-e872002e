import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET") || "uservault-default-secret-change-in-prod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-encrypted, x-session-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_MESSAGES_PER_CONVERSATION = 30;
const MAX_MESSAGES_PER_IP = 100;
const MAX_CONCURRENT_STREAMS = 50;

// In-memory stores
const conversationCounts = new Map<string, { count: number; resetTime: number }>();
const ipCounts = new Map<string, { count: number; resetTime: number }>();
let activeStreams = 0;

// Key derivation for encryption
async function deriveKey(identifier: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(`${ENCRYPTION_SECRET}:${identifier}:chat-encryption`);
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const salt = encoder.encode("uservault-chat-encryption-v1");
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 50000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Decrypt incoming payload
async function decryptPayload(encrypted: string, iv: string, key: CryptoKey): Promise<unknown> {
  const decoder = new TextDecoder();
  const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivArray },
    key,
    encryptedData
  );
  
  return JSON.parse(decoder.decode(decryptedBuffer));
}

// Encrypt outgoing response
async function encryptResponse(data: unknown, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(data));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Encrypt streaming chunk
async function encryptChunk(chunk: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(chunk);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  
  const ivB64 = btoa(String.fromCharCode(...iv));
  const dataB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  
  return `${ivB64}:${dataB64}`;
}

function checkAndUpdateLimit(
  key: string,
  store: Map<string, { count: number; resetTime: number }>,
  maxRequests: number
): { allowed: boolean; remaining: number } {
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

// Cleanup old entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of conversationCounts.entries()) {
    if (value.resetTime <= now) conversationCounts.delete(key);
  }
  for (const [key, value] of ipCounts.entries()) {
    if (value.resetTime <= now) ipCounts.delete(key);
  }
}, 60 * 1000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  try {
    // Check for encryption header
    const isEncrypted = req.headers.get("x-encrypted") === "true";
    const sessionToken = req.headers.get("x-session-token");
    const authHeader = req.headers.get("Authorization");
    
    let userId: string | null = null;
    let encryptionKey: CryptoKey;
    
    // Try to authenticate user
    if (authHeader?.startsWith("Bearer ") && authHeader.length > 50) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }
    
    // Derive encryption key based on user ID or session token
    const keyIdentifier = userId || sessionToken || clientIp;
    encryptionKey = await deriveKey(keyIdentifier);
    
    let requestBody: { messages: Array<{ role: string; content: string }>; conversationId?: string; sessionToken?: string };
    
    if (isEncrypted) {
      const { encrypted, iv } = await req.json();
      requestBody = await decryptPayload(encrypted, iv, encryptionKey) as typeof requestBody;
    } else {
      requestBody = await req.json();
    }
    
    const { messages, conversationId } = requestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Rate limiting checks
    if (activeStreams >= MAX_CONCURRENT_STREAMS) {
      console.log("Global stream limit reached");
      const errorData = { error: "Service is busy. Please try again in a moment." };
      if (isEncrypted) {
        const encrypted = await encryptResponse(errorData, encryptionKey);
        return new Response(JSON.stringify(encrypted), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true", "Retry-After": "30" }
        });
      }
      return new Response(JSON.stringify(errorData), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" }
      });
    }

    const ipCheck = checkAndUpdateLimit(clientIp, ipCounts, MAX_MESSAGES_PER_IP);
    if (!ipCheck.allowed) {
      console.log("IP rate limit exceeded");
      const errorData = { error: "Rate limit exceeded. Please try again later." };
      if (isEncrypted) {
        const encrypted = await encryptResponse(errorData, encryptionKey);
        return new Response(JSON.stringify(encrypted), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true", "Retry-After": "3600" }
        });
      }
      return new Response(JSON.stringify(errorData), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" }
      });
    }

    if (conversationId) {
      const convCheck = checkAndUpdateLimit(conversationId, conversationCounts, MAX_MESSAGES_PER_CONVERSATION);
      if (!convCheck.allowed) {
        console.log("Conversation rate limit exceeded:", conversationId);
        const errorData = { error: "This conversation has reached its message limit. Please start a new chat or wait an hour." };
        if (isEncrypted) {
          const encrypted = await encryptResponse(errorData, encryptionKey);
          return new Response(JSON.stringify(encrypted), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true", "Retry-After": "3600" }
          });
        }
        return new Response(JSON.stringify(errorData), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" }
        });
      }
    }

    console.log("Processing encrypted chat for:", conversationId ? `conv:${conversationId.substring(0, 8)}...` : "anonymous");

    // Check if live agent has taken over
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
        const errorData = { error: "A live agent is handling this chat.", code: "AGENT_ASSIGNED" };
        if (isEncrypted) {
          const encrypted = await encryptResponse(errorData, encryptionKey);
          return new Response(JSON.stringify(encrypted), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true" }
          });
        }
        return new Response(JSON.stringify(errorData), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

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
          const errorData = { error: "Rate limit exceeded, please try again later." };
          if (isEncrypted) {
            const encrypted = await encryptResponse(errorData, encryptionKey);
            return new Response(JSON.stringify(encrypted), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true" }
            });
          }
          return new Response(JSON.stringify(errorData), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (response.status === 402) {
          const errorData = { error: "Payment required." };
          if (isEncrypted) {
            const encrypted = await encryptResponse(errorData, encryptionKey);
            return new Response(JSON.stringify(encrypted), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json", "x-encrypted": "true" }
            });
          }
          return new Response(JSON.stringify(errorData), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      // For encrypted mode, we encrypt each SSE chunk
      if (isEncrypted) {
        const { readable, writable } = new TransformStream();
        
        (async () => {
          const reader = response.body!.getReader();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Encrypt the chunk
              const chunk = new TextDecoder().decode(value);
              const encryptedChunk = await encryptChunk(chunk, encryptionKey);
              
              // Send as encrypted SSE
              await writer.write(encoder.encode(`data: ${encryptedChunk}\n\n`));
            }
            await writer.write(encoder.encode("data: [DONE]\n\n"));
          } finally {
            await writer.close();
            activeStreams--;
          }
        })();

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "x-encrypted": "true",
            "X-RateLimit-Remaining": String(ipCheck.remaining)
          },
        });
      }

      // Non-encrypted streaming (fallback)
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
    console.error("Encrypted chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
