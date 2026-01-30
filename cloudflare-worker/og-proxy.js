/**
 * Cloudflare Worker für UserVault Open Graph Embeds
 * 
 * ERSETZE den "biolink" Worker mit diesem Code!
 * Oder ändere die Routes zu diesem Worker.
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

// Supabase Config
const SUPABASE_URL = "https://cjulgfbmcnmrkvnzkpym.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdWxnZmJtY25tcmt2bnprcHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTU5MTUsImV4cCI6MjA4NDc3MTkxNX0.FDQnngSKGd9dx7ZQHn0wCghph7pViIAYuZc8jMjWBhE";

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

async function fetchProfile(username) {
  // Try by username first
  let query = `username=eq.${username}`;
  
  // If numeric, also try uid_number
  if (/^\d+$/.test(username)) {
    query = `uid_number=eq.${username}`;
  }
  
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?${query}&select=username,display_name,bio,avatar_url,og_title,og_description,og_image_url,og_icon_url`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] || null;
}

function generateOGHtml(profile, originalUrl) {
  const title = profile.og_title || profile.display_name || profile.username || "UserVault";
  const description = profile.og_description || profile.bio || `Check out ${profile.username}'s profile on UserVault`;
  const image = profile.og_image_url || profile.avatar_url || "https://uservault.cc/og-image.png";
  const icon = profile.og_icon_url || "https://uservault.cc/favicon.ico";
  const url = originalUrl || `https://uservault.cc/${profile.username}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="UserVault">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <!-- Favicon -->
  <link rel="icon" href="${escapeHtml(icon)}">
  
  <!-- Redirect real users -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    
    // Not a profile page or not a bot -> pass through to origin
    if (!username || !botDetected) {
      const response = await fetch(request);
      // Add debug headers to passthrough response
      const newResponse = new Response(response.body, response);
      Object.entries(debugHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
      return newResponse;
    }
    
    console.log(`[OG] Bot detected for: ${username}`);
    
    try {
      const profile = await fetchProfile(username);
      
      if (!profile) {
        console.log(`[OG] Profile not found: ${username}`);
        const response = await fetch(request);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("X-OG-Worker", "active-no-profile");
        return newResponse;
      }
      
      const html = generateOGHtml(profile, request.url);
      
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Robots-Tag": "noindex",
          "X-OG-Worker": "active-generated",
          "X-OG-Profile": profile.username,
        },
      });
    } catch (error) {
      console.error(`[OG] Error:`, error);
      const response = await fetch(request);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("X-OG-Worker", "error");
      newResponse.headers.set("X-OG-Error", error.message);
      return newResponse;
    }
  },
};
