import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bump this whenever you deploy to quickly verify the running version
const VERSION = '2026-02-05.1';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
  verified: boolean;
  global_name: string | null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log(`[discord-oauth-callback ${VERSION}] ${req.method} ${url.pathname}${url.search}`);
  
  // Handle both GET (redirect callback) and POST (AJAX callback)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let code: string | null = null;
    let state: string | null = null;
    let redirect_uri: string | null = null;
    let mode: string = 'login'; // 'login' or 'link'
    let user_id: string | null = null;
    let frontend_origin: string = 'https://uservault.cc'; // Default

    // Helper to extract origin from state
    const extractOriginFromState = (stateParam: string | null): string => {
      if (!stateParam) return 'https://uservault.cc';
      try {
        const decoded = JSON.parse(atob(stateParam));
        return decoded.origin || 'https://uservault.cc';
      } catch {
        return 'https://uservault.cc';
      }
    };

    if (req.method === 'GET') {
      // Redirect callback from Discord
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      
      // Extract origin from state
      frontend_origin = extractOriginFromState(state);
      console.log('GET callback - redirecting to:', frontend_origin);
      
      // IMPORTANT: return an HTML redirect page instead of a 302.
      // Some proxies (e.g. Worker fetch with redirect: "follow") can swallow 302s and
      // return the frontend HTML under the proxy origin, which breaks asset loading.
      const redirectUrl = new URL('/auth', frontend_origin);
      if (code && state) {
        redirectUrl.searchParams.set('discord_code', code);
        redirectUrl.searchParams.set('discord_state', state);
      } else {
        redirectUrl.searchParams.set('error', 'No authorization code received');
      }

      const to = redirectUrl.toString();
      const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Discord wird verbunden…</title>
    <meta http-equiv="cache-control" content="no-cache" />
    <meta http-equiv="pragma" content="no-cache" />
    <meta http-equiv="expires" content="0" />
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
    <p>Weiterleitung…</p>
    <p><a href="${to}">Falls du nicht automatisch weitergeleitet wirst, klicke hier.</a></p>
    <script>
      window.location.replace(${JSON.stringify(to)});
    </script>
  </body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
      
    } else if (req.method === 'POST') {
      const body = await req.json();
      code = body.code;
      state = body.state;
      redirect_uri = body.redirect_uri;
      mode = body.mode || 'login';
      user_id = body.user_id;
    }

    if (!code) {
      throw new Error('No authorization code provided');
    }

    const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID');
    const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      throw new Error('Discord credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Exchange code for access token
    console.log('Exchanging code for token...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri || `${SUPABASE_URL}/functions/v1/discord-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Discord user info
    console.log('Fetching Discord user info...');
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord user info');
    }

    const discordUser: DiscordUser = await userResponse.json();
    console.log('Discord user:', discordUser.username, discordUser.id);

    if (!discordUser.email) {
      throw new Error('Discord account does not have an email. Please use an account with a verified email.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (mode === 'link' && user_id) {
      // Link mode - connect Discord to existing account
      console.log('Linking Discord to user:', user_id);
      
      // Check if Discord is already linked to another account
      const { data: existingLink } = await supabase
        .from('discord_integrations')
        .select('user_id')
        .eq('discord_id', discordUser.id)
        .single();

      if (existingLink && existingLink.user_id !== user_id) {
        return new Response(JSON.stringify({ 
          success: false,
          _version: VERSION,
          error: 'This Discord account is already linked to another user' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert discord integration
      const { error: linkError } = await supabase
        .from('discord_integrations')
        .upsert({
          user_id: user_id,
          discord_id: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          show_on_profile: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (linkError) {
        console.error('Link error:', linkError);
        throw new Error('Failed to link Discord account');
      }

      // Also update profile with discord_user_id
      await supabase
        .from('profiles')
        .update({ discord_user_id: discordUser.id })
        .eq('user_id', user_id);

      return new Response(JSON.stringify({ 
        success: true,
        _version: VERSION,
        discord_user: {
          id: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Login/Register mode
      console.log('Processing Discord login/register...');

      // Check if user exists with this email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === discordUser.email?.toLowerCase());

      let userId: string;
      let isNewUser = false;

      if (existingUser) {
        // User exists - sign them in
        console.log('Existing user found, signing in...');
        userId = existingUser.id;
        
        // Update their Discord integration
        await supabase
          .from('discord_integrations')
          .upsert({
            user_id: userId,
            discord_id: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            show_on_profile: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        // Update profile discord_user_id
        await supabase
          .from('profiles')
          .update({ 
            discord_user_id: discordUser.id,
            use_discord_avatar: true,
          })
          .eq('user_id', userId);

      } else {
        // New user - create account
        console.log('Creating new user...');
        isNewUser = true;
        
        // Generate a unique username from Discord username
        let username = discordUser.global_name || discordUser.username;
        username = username.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if username exists and add random suffix if needed
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', username)
          .single();

        if (existingProfile) {
          username = `${username}${Math.floor(Math.random() * 9999)}`;
        }

        // Create the user with a random password (they'll use Discord to login)
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: discordUser.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            discord_id: discordUser.id,
            discord_username: discordUser.global_name || discordUser.username,
            avatar_url: discordUser.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
          },
        });

        if (createError || !newUser.user) {
          console.error('Create user error:', createError);
          throw new Error('Failed to create user account');
        }

        userId = newUser.user.id;

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: username,
            display_name: discordUser.global_name || discordUser.username,
            discord_user_id: discordUser.id,
            use_discord_avatar: true,
            email_verified: true,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Create Discord integration
        await supabase
          .from('discord_integrations')
          .insert({
            user_id: userId,
            discord_id: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            show_on_profile: true,
          });
      }

      // Generate a magic link for the user to sign in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: discordUser.email,
      });

      if (linkError || !linkData) {
        console.error('Magic link error:', linkError);
        throw new Error('Failed to generate login link');
      }

      // Extract the token from the magic link
      const magicLinkUrl = new URL(linkData.properties.action_link);
      const token = magicLinkUrl.hash.split('access_token=')[1]?.split('&')[0];
      
      // Return success with session info
      return new Response(JSON.stringify({ 
        success: true,
        _version: VERSION,
        is_new_user: isNewUser,
        email: discordUser.email,
        action_link: linkData.properties.action_link,
        discord_user: {
          id: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    console.error('Discord OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (req.method === 'GET') {
      const errorUrl = new URL('/auth', url.origin);
      errorUrl.searchParams.set('error', message);
      return Response.redirect(errorUrl.toString(), 302);
    }
    
    return new Response(JSON.stringify({ error: message, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
