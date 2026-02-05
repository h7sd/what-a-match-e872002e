import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Health check function to test all API endpoints
async function runHealthCheck(supabase: any, supabaseUrl: string, supabaseAnonKey: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'ok' | 'error'; latency_ms: number; error?: string }>;
  timestamp: string;
  version: string;
}> {
  const checks: Record<string, { status: 'ok' | 'error'; latency_ms: number; error?: string }> = {};
  
  // Test database connectivity
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    checks.database = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - dbStart,
      ...(error && { error: 'Connection failed' })
    };
  } catch (e) {
    checks.database = { status: 'error', latency_ms: Date.now() - dbStart, error: 'Connection failed' };
  }

  // Test auth service (admin endpoint)
  const authStart = Date.now();
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.auth_service = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - authStart,
      ...(error && { error: 'Auth service unavailable' })
    };
  } catch (e) {
    checks.auth_service = { status: 'error', latency_ms: Date.now() - authStart, error: 'Auth service unavailable' };
  }

  // Test LOGIN endpoint (GoTrue signInWithPassword endpoint)
  const loginStart = Date.now();
  try {
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email: 'health_check_nonexistent@test.invalid',
        password: 'health_check_test_password_123'
      })
    });
    // We expect 400 (invalid credentials) - that means the endpoint is working
    // 5xx would indicate service issues
    const isHealthy = loginResponse.status < 500;
    checks.login_endpoint = { 
      status: isHealthy ? 'ok' : 'error', 
      latency_ms: Date.now() - loginStart,
      ...(!isHealthy && { error: `HTTP ${loginResponse.status}` })
    };
  } catch (e) {
    checks.login_endpoint = { status: 'error', latency_ms: Date.now() - loginStart, error: 'Request failed' };
  }

  // Test REGISTER endpoint (GoTrue signup endpoint)
  const registerStart = Date.now();
  try {
    const registerResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email: 'health_check_test_' + Date.now() + '@test.invalid',
        password: 'health_check_test_password_123'
      })
    });
    // We expect 200 (signup created but unconfirmed) or 422 (validation) or 429 (rate limit)
    // 5xx would indicate service issues
    const isHealthy = registerResponse.status < 500;
    checks.register_endpoint = { 
      status: isHealthy ? 'ok' : 'error', 
      latency_ms: Date.now() - registerStart,
      ...(!isHealthy && { error: `HTTP ${registerResponse.status}` })
    };
  } catch (e) {
    checks.register_endpoint = { status: 'error', latency_ms: Date.now() - registerStart, error: 'Request failed' };
  }

  // Test profiles query
  const statsStart = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('views_count').limit(5);
    checks.profiles = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - statsStart,
      ...(error && { error: 'Query failed' })
    };
  } catch (e) {
    checks.profiles = { status: 'error', latency_ms: Date.now() - statsStart, error: 'Query failed' };
  }

  // Test social_links query
  const linksStart = Date.now();
  try {
    const { error } = await supabase.from('social_links').select('id').limit(1);
    checks.social_links = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - linksStart,
      ...(error && { error: 'Query failed' })
    };
  } catch (e) {
    checks.social_links = { status: 'error', latency_ms: Date.now() - linksStart, error: 'Query failed' };
  }

  // Test global_badges query
  const badgesStart = Date.now();
  try {
    const { error } = await supabase.from('global_badges').select('id').limit(1);
    checks.badges = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - badgesStart,
      ...(error && { error: 'Query failed' })
    };
  } catch (e) {
    checks.badges = { status: 'error', latency_ms: Date.now() - badgesStart, error: 'Query failed' };
  }

  // Test Discord bot connectivity (check if bot commands table is accessible and has recent activity)
  const discordBotStart = Date.now();
  try {
    // Check if bot_commands table exists and has enabled commands
    const { data: commands, error: cmdError } = await supabase
      .from('bot_commands')
      .select('id, is_enabled, updated_at')
      .eq('is_enabled', true)
      .limit(5);
    
    if (cmdError) {
      checks.discord_bot = { 
        status: 'error', 
        latency_ms: Date.now() - discordBotStart, 
        error: 'Commands table unavailable' 
      };
    } else {
      // Also check recent bot activity via bot_command_notifications
      const { data: recentNotifications, error: notifError } = await supabase
        .from('bot_command_notifications')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Check if there was activity in the last 24 hours
      const hasRecentActivity = recentNotifications && recentNotifications.length > 0 && 
        (Date.now() - new Date(recentNotifications[0].created_at).getTime()) < 24 * 60 * 60 * 1000;
      
      // Also check daily_rewards for Discord bot activity
      const { data: recentRewards, error: rewardsError } = await supabase
        .from('daily_rewards')
        .select('id, last_claim')
        .order('last_claim', { ascending: false })
        .limit(1);
      
      const hasRecentRewards = recentRewards && recentRewards.length > 0 &&
        (Date.now() - new Date(recentRewards[0].last_claim).getTime()) < 24 * 60 * 60 * 1000;
      
      const commandsAvailable = commands && commands.length > 0;
      const botActive = hasRecentActivity || hasRecentRewards;
      
      checks.discord_bot = { 
        status: commandsAvailable ? 'ok' : 'error', 
        latency_ms: Date.now() - discordBotStart,
        ...(!commandsAvailable && { error: 'No active commands' }),
        ...(commandsAvailable && !botActive && { error: 'No recent bot activity (24h)' })
      };
    }
  } catch (e) {
    checks.discord_bot = { status: 'error', latency_ms: Date.now() - discordBotStart, error: 'Check failed' };
  }

  // Test minigame system (part of Discord bot)
  const minigameStart = Date.now();
  try {
    const { data: stats, error } = await supabase
      .from('minigame_stats')
      .select('id')
      .limit(1);
    
    checks.minigame_system = { 
      status: error ? 'error' : 'ok', 
      latency_ms: Date.now() - minigameStart,
      ...(error && { error: 'Minigame stats unavailable' })
    };
  } catch (e) {
    checks.minigame_system = { status: 'error', latency_ms: Date.now() - minigameStart, error: 'Check failed' };
  }

  // Calculate overall status
  const errorCount = Object.values(checks).filter(c => c.status === 'error').length;
  const totalChecks = Object.keys(checks).length;
  
  // Critical services: database, auth_service, login_endpoint, register_endpoint
  const criticalChecks = ['database', 'auth_service', 'login_endpoint', 'register_endpoint'];
  const criticalErrors = criticalChecks.filter(key => checks[key]?.status === 'error').length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (criticalErrors > 0) {
    status = 'unhealthy';
  } else if (errorCount > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: '1.1.0'
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result = await runHealthCheck(supabase, supabaseUrl, supabaseAnonKey);

    // Return appropriate HTTP status based on health
    const httpStatus = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    return new Response(
      JSON.stringify(result),
      { 
        status: httpStatus,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'unhealthy', 
        error: 'Internal error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});