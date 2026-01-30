import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const username = url.searchParams.get("u") || url.searchParams.get("username");

  if (!username) {
    return new Response("Username required. Use ?u=username", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, og_title, og_description, og_image_url, og_icon_url")
    .or(`username.eq.${username.toLowerCase()},alias_username.eq.${username.toLowerCase()}`)
    .maybeSingle();

  if (error || !profile) {
    console.log(`[OG-EMBED] Profile not found: ${username}`);
    return new Response("Profile not found", { status: 404 });
  }

  // Build OG data with fallbacks
  const ogTitle = profile.og_title || `@${profile.username} | uservault.cc`;
  const ogDescription = profile.og_description || profile.bio || `Check out ${profile.display_name || profile.username}'s profile on UserVault`;
  const ogImage = profile.og_image_url || profile.avatar_url || "https://what-a-match.lovable.app/og-image.png";
  const ogIcon = profile.og_icon_url || "https://storage.googleapis.com/gpt-engineer-file-uploads/N7OIoQRjNPSXaLFdJjQDPkdaXHs1/uploads/1769473434323-UserVault%204%20(1).png";
  const profileUrl = `https://uservault.cc/${profile.username}`;
  const siteUrl = "https://what-a-match.lovable.app";

  // Return HTML page with OG tags that redirects to actual profile
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="title" content="${escapeHtml(ogTitle)}">
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <meta name="theme-color" content="#8B5CF6">
  
  <!-- Open Graph / Discord -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:site_name" content="UserVault">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${profileUrl}">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="${ogIcon}">
  
  <!-- Redirect to actual profile after a brief moment -->
  <meta http-equiv="refresh" content="0;url=${siteUrl}/${profile.username}">
  
  <style>
    body {
      background: #0a0a0a;
      color: #fff;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #333;
      border-top-color: #8B5CF6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to ${escapeHtml(profile.display_name || profile.username)}'s profile...</p>
  </div>
  <script>
    // Immediate redirect for JS-enabled browsers
    window.location.href = "${siteUrl}/${profile.username}";
  </script>
</body>
</html>`;

  console.log(`[OG-EMBED] Serving embed page for: ${username}`);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
