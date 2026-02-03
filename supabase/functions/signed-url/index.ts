import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Signed URL expiry (1 hour for normal assets, 5 minutes for sensitive)
const NORMAL_EXPIRY_SECONDS = 3600;
const SENSITIVE_EXPIRY_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify user with anon key
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, bucket, path, paths, sensitive } = await req.json();

    // Admin client for signed URLs
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'sign') {
      // Single file signing
      if (!bucket || !path) {
        return new Response(
          JSON.stringify({ error: 'Missing bucket or path' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to this path (must be their own files or public)
      const isOwnFile = path.startsWith(`${user.id}/`) || path.startsWith(`encrypted/${user.id}/`);
      const isPublicBadge = bucket === 'profile-assets' && path.startsWith('badges/');
      
      if (!isOwnFile && !isPublicBadge) {
        // Check if user is admin for accessing other files
        const { data: roleData } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (!roleData) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const expirySeconds = sensitive ? SENSITIVE_EXPIRY_SECONDS : NORMAL_EXPIRY_SECONDS;
      
      const { data: signedData, error: signError } = await adminClient
        .storage
        .from(bucket)
        .createSignedUrl(path, expirySeconds);

      if (signError) {
        console.error('Signed URL error:', signError);
        return new Response(
          JSON.stringify({ error: 'Failed to create signed URL' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          signedUrl: signedData.signedUrl,
          expiresAt: Date.now() + (expirySeconds * 1000)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sign-batch') {
      // Batch signing for multiple files
      if (!bucket || !paths || !Array.isArray(paths)) {
        return new Response(
          JSON.stringify({ error: 'Missing bucket or paths array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit batch size
      if (paths.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Maximum 50 paths per batch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expirySeconds = sensitive ? SENSITIVE_EXPIRY_SECONDS : NORMAL_EXPIRY_SECONDS;
      const results: Record<string, string> = {};

      for (const p of paths) {
        // Security check for each path
        const isOwnFile = p.startsWith(`${user.id}/`) || p.startsWith(`encrypted/${user.id}/`);
        const isPublicBadge = bucket === 'profile-assets' && p.startsWith('badges/');
        
        if (isOwnFile || isPublicBadge) {
          const { data: signedData } = await adminClient
            .storage
            .from(bucket)
            .createSignedUrl(p, expirySeconds);
          
          if (signedData) {
            results[p] = signedData.signedUrl;
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          signedUrls: results,
          expiresAt: Date.now() + (expirySeconds * 1000)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signed URL error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
