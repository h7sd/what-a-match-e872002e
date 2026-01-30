import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    if (!username) {
      return new Response(JSON.stringify({ error: "Username required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch profile by username or alias
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url, og_title, og_description, og_image_url, og_icon_url, og_title_animation")
      .or(`username.eq.${username.toLowerCase()},alias_username.eq.${username.toLowerCase()}`)
      .maybeSingle();

    if (error || !profile) {
      console.log(`[OG] Profile not found: ${username}`);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OG data with fallbacks
    const ogTitle = profile.og_title || `@${profile.username} | uservault.cc`;
    const ogDescription = profile.og_description || profile.bio || `Check out ${profile.display_name || profile.username}'s profile on UserVault`;
    const ogImage = profile.og_image_url || profile.avatar_url || "https://what-a-match.lovable.app/og-image.png";
    const ogIcon = profile.og_icon_url || "https://storage.googleapis.com/gpt-engineer-file-uploads/N7OIoQRjNPSXaLFdJjQDPkdaXHs1/uploads/1769473434323-UserVault%204%20(1).png";
    const profileUrl = `https://uservault.cc/${profile.username}`;

    // Return OG metadata as JSON (can be used by frontend or rendered server-side)
    const ogData = {
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      icon: ogIcon,
      url: profileUrl,
      siteName: "UserVault",
      type: "profile",
      username: profile.username,
      displayName: profile.display_name,
      animation: profile.og_title_animation || "none",
    };

    console.log(`[OG] Generated metadata for: ${username}`, ogData);

    return new Response(JSON.stringify(ogData), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("[OG] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
