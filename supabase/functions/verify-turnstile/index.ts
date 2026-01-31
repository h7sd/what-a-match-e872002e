import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TurnstileRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: TurnstileRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing turnstile token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");
    if (!secretKey) {
      console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY not configured - failing closed");
      return new Response(
        JSON.stringify({ success: false, error: "Verification service unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get client IP from headers
    const ip = req.headers.get("cf-connecting-ip") || 
               req.headers.get("x-forwarded-for")?.split(",")[0] || 
               "";

    // Verify the token with Cloudflare
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const verifyResult = await verifyResponse.json();
    console.log("Turnstile verification result:", verifyResult.success ? "success" : "failed");

    if (verifyResult.success) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      const errorCodes = verifyResult["error-codes"] || [];
      console.error("Turnstile verification failed:", errorCodes);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Verification failed",
          codes: errorCodes 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-turnstile function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Verification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
