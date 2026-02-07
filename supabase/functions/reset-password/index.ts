import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": [
    "authorization", "x-client-info", "apikey", "content-type",
    "x-supabase-client-platform", "x-supabase-client-platform-version",
    "x-supabase-client-runtime", "x-supabase-client-runtime-version",
    "x-forwarded-for", "x-real-ip", "cf-connecting-ip", "x-client-ip",
  ].join(", "),
  "Access-Control-Max-Age": "86400",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) return json({ error: "Missing required fields" }, 400);
    if (newPassword.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedCode = code.trim();

    // 1. Verify the reset code exists and is valid
    const { data: codes, error: fetchError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", trimmedCode)
      .eq("type", "password_reset")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !codes || codes.length === 0) {
      console.error("Code not found:", fetchError?.message);
      return json({ error: "Invalid or expired reset code" }, 400);
    }

    // 2. Mark code as used IMMEDIATELY
    await supabaseAdmin
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codes[0].id);

    // 3. Find user via Auth Admin REST API - paginate through ALL users
    let userId: string | null = null;
    let page = 1;
    
    while (!userId && page <= 20) {
      console.log("Searching auth users page:", page);
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,
        {
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
          },
        }
      );
      
      if (!listRes.ok) {
        console.error("Failed to list users:", listRes.status, await listRes.text());
        break;
      }
      
      const listData = await listRes.json();
      const users = listData.users || [];
      console.log("Page", page, "returned", users.length, "users");
      
      if (users.length === 0) break;
      
      const found = users.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      );
      
      if (found) {
        userId = found.id;
        console.log("Found user:", userId);
      }
      
      if (users.length < 100) break;
      page++;
    }

    if (!userId) {
      console.error("User not found after searching all pages for:", normalizedEmail);
      return json({ error: "User not found" }, 400);
    }

    // 4. Update password via Auth Admin REST API
    console.log("Updating password for user:", userId);
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const updateBody = await updateRes.text();
    console.log("Password update response:", updateRes.status, updateBody);

    if (!updateRes.ok) {
      let errorMsg = "Failed to update password";
      try {
        const parsed = JSON.parse(updateBody);
        errorMsg = parsed.msg || parsed.error || parsed.message || errorMsg;
      } catch {}

      if (errorMsg.includes("weak") || errorMsg.includes("easy to guess")) {
        return json({ error: "Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and symbols." }, 400);
      }
      console.error("Password update failed:", errorMsg);
      return json({ error: errorMsg }, 500);
    }

    console.log("Password reset successful for user:", userId);

    return json({ success: true, message: "Password updated successfully. Please log in with your new password." });
  } catch (error: any) {
    console.error("Error in reset-password:", error.message);
    return json({ error: error.message }, 500);
  }
});
