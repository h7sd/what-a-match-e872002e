const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  url: string;
  ua?: string;
};

function isAllowed(url: URL) {
  // Only allow our public domain to avoid SSRF.
  return url.hostname === "uservault.cc" || url.hostname === "www.uservault.cc";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Body;
    const target = new URL(body.url);

    if (!isAllowed(target)) {
      return new Response(JSON.stringify({ error: "URL host not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = body.ua || "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

    const res = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "user-agent": ua,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const text = await res.text();
    const snippet = text.slice(0, 4000);

    return new Response(
      JSON.stringify(
        {
          requested: target.toString(),
          status: res.status,
          contentType: res.headers.get("content-type"),
          snippet,
          hasOgTitle: /property=\"og:title\"/i.test(text),
          hasShareMarker: /\[OG-EMBED\]/i.test(text) || /Open profile/i.test(text),
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
