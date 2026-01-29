import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create client with user's auth to verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify calling user is an admin
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: callingUser.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target username from request
    const { username } = await req.json();
    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the user by username
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username, display_name')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's email from auth.users using admin API
    const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    
    if (userError || !targetUser || !targetUser.email) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve user data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a magic link for the target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://what-a-match.lovable.app'}/dashboard`,
      }
    });

    if (linkError || !linkData) {
      console.error('Magic link error:', linkError);
      return new Response(
        JSON.stringify({ error: "Could not generate login link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the magic link properties so frontend can verify the OTP
    return new Response(
      JSON.stringify({ 
        success: true,
        email: targetUser.email,
        token_hash: linkData.properties?.hashed_token,
        user: {
          username: profile.username,
          display_name: profile.display_name
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Impersonation error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});