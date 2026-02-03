/**
 * Cloudflare Worker - Full API Proxy for UserVault
 * 
 * Proxies ALL Supabase requests through your custom domain
 * so the actual Supabase URL is never exposed in browser dev tools.
 * 
 * Deploy this to a route like: api.uservault.cc/*
 * Or use a path like: uservault.cc/api/*
 */

// The actual Supabase URL (hidden from clients)
const SUPABASE_URL = "https://cjulgfbmcnmrkvnzkpym.supabase.co";

// Paths that should be proxied
const PROXY_PATHS = [
  "/rest/v1/",      // PostgREST API
  "/auth/v1/",      // Auth API
  "/storage/v1/",   // Storage API
  "/functions/v1/", // Edge Functions
  "/realtime/v1/",  // Realtime WebSocket
];

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, prefer, range, x-upsert",
  "Access-Control-Expose-Headers": "content-range, x-total-count",
  "Access-Control-Max-Age": "86400",
};

/**
 * Check if a path should be proxied to Supabase
 */
function shouldProxy(pathname) {
  return PROXY_PATHS.some(prefix => pathname.startsWith(prefix));
}

/**
 * Proxy request to Supabase
 */
async function proxyToSupabase(request, pathname) {
  const url = new URL(request.url);
  
  // Build the target Supabase URL
  const targetUrl = new URL(pathname + url.search, SUPABASE_URL);
  
  // Clone headers and modify as needed
  const headers = new Headers(request.headers);
  
  // Set correct host header for Supabase
  headers.set("Host", new URL(SUPABASE_URL).host);
  
  // Forward the request
  const method = request.method.toUpperCase();
  const body = (method === "GET" || method === "HEAD") ? undefined : request.body;
  
  const proxyRequest = new Request(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: "follow",
  });
  
  try {
    const response = await fetch(proxyRequest);
    
    // Clone the response and add CORS headers
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    // Add cache-control for certain endpoints
    if (pathname.includes("/storage/v1/object/public/")) {
      newHeaders.set("Cache-Control", "public, max-age=31536000");
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("[API Proxy] Error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
}

/**
 * Handle WebSocket upgrade for Realtime
 */
async function handleWebSocket(request, pathname) {
  const url = new URL(request.url);
  const targetUrl = new URL(pathname + url.search, SUPABASE_URL.replace("https://", "wss://"));
  
  // For WebSocket, we need to use Cloudflare's Durable Objects or just pass through
  // This is a simplified version - for full WebSocket support, you'd need Durable Objects
  return fetch(targetUrl.toString(), {
    headers: request.headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // Check if this is an API request that should be proxied
    if (shouldProxy(pathname)) {
      // Handle WebSocket upgrade for Realtime
      if (request.headers.get("Upgrade") === "websocket" && pathname.startsWith("/realtime/")) {
        return handleWebSocket(request, pathname);
      }
      
      return proxyToSupabase(request, pathname);
    }
    
    // Not an API request - return 404 or pass through
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  },
};
