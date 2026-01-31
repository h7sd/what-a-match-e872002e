/**
 * Cloudflare Worker für UserVault Open Graph Embeds
 * 
 * Ruft die Edge Function auf um OG-HTML für Discord/Twitter zu generieren
 */

// Bot User-Agent patterns
const BOT_PATTERNS = [
  /discordbot/i,
  /twitterbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /slackbot/i,
  /linkedinbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /applebot/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /embedly/i,
  /pinterest/i,
  /redditbot/i,
  /viber/i,
  /tumblr/i,
  /skypeuripreview/i,
  /vkshare/i,
];

// Edge Function URL for OG HTML generation
const OG_FUNCTION_URL = "https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/share";

// Lovable origin URL (where the actual app is hosted)
const LOVABLE_ORIGIN = "https://what-a-match.lovable.app";

function isBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  const url = new URL(request.url);
  
  // Debug: ?__bot=1 forces bot behavior
  if (url.searchParams.has("__bot")) return true;
  
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return true;
  }
  return false;
}

function extractUsername(url) {
  const path = url.pathname;
  
  const ignorePaths = ["/", "/auth", "/dashboard", "/privacy", "/terms", "/imprint", "/assets", "/favicon.ico", "/robots.txt"];
  for (const ignore of ignorePaths) {
    if (path === ignore || path.startsWith(ignore + "/") || path.startsWith("/assets/")) {
      return null;
    }
  }
  
  let username = path.replace(/^\/+/, "").replace(/^@/, "").replace(/\/+$/, "");
  if (!username || !/^[a-zA-Z0-9_.]+$/.test(username)) return null;
  return username;
}

async function fetchOGHtml(username, originalUrl) {
  const encodedUsername = encodeURIComponent(username);
  const encodedSrc = encodeURIComponent(originalUrl);
  const res = await fetch(`${OG_FUNCTION_URL}?u=${encodedUsername}&src=${encodedSrc}`);
  
  if (!res.ok) {
    console.log(`[OG] Edge function returned ${res.status} for: ${username}`);
    return null;
  }
  
  return await res.text();
}

// Proxy request to Lovable origin
async function proxyToOrigin(request) {
  const url = new URL(request.url);
  // Rewrite host to Lovable origin
  const originUrl = new URL(url.pathname + url.search, LOVABLE_ORIGIN);
  
  const newRequest = new Request(originUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });
  
  return fetch(newRequest);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const username = extractUsername(url);
    const botDetected = isBot(request);
    
    // Debug header to confirm Worker is active
    const debugHeaders = {
      "X-OG-Worker": "active",
      "X-OG-Username": username || "null",
      "X-OG-IsBot": String(botDetected),
    };
    
    // Not a profile page or not a bot -> proxy to Lovable origin
    if (!username || !botDetected) {
      const response = await proxyToOrigin(request);
      const newResponse = new Response(response.body, response);
      Object.entries(debugHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
      return newResponse;
    }
    
    console.log(`[OG] Bot detected for: ${username}`);
    
    try {
      const html = await fetchOGHtml(username, url.toString());
      
      if (!html) {
        console.log(`[OG] No HTML returned for: ${username}`);
        const response = await proxyToOrigin(request);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("X-OG-Worker", "active-no-profile");
        return newResponse;
      }
      
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Robots-Tag": "noindex",
          "X-OG-Worker": "active-generated",
        },
      });
    } catch (error) {
      console.error(`[OG] Error:`, error);
      const response = await proxyToOrigin(request);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("X-OG-Worker", "error");
      newResponse.headers.set("X-OG-Error", error.message);
      return newResponse;
    }
  },
};
