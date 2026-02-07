import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-only export - requires admin role
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Export all tables
    const tables = [
      "global_badges",
      "profiles",
      "user_roles",
      "user_badges",
      "user_balances",
      "user_streaks",
      "social_links",
      "badges",
      "friend_badges",
      "discord_integrations",
      "discord_presence",
      "purchases",
      "promo_codes",
      "promo_code_uses",
      "bot_commands",
      "bot_command_notifications",
      "daily_rewards",
      "minigame_stats",
      "badge_events",
      "badge_steals",
      "badge_requests",
      "admin_webhooks",
      "admin_notifications",
      "admin_discord_roles",
      "alias_requests",
      "marketplace_items",
      "marketplace_purchases",
      "support_tickets",
      "support_messages",
      "live_chat_conversations",
      "live_chat_messages",
      "user_notifications",
    ];

    const exportData: Record<string, any[]> = {};
    const errors: string[] = [];
    const authUsers: any[] = [];

    // Export auth users (login accounts). NOTE: passwords cannot be migrated directly from an export.
    try {
      const perPage = 1000;
      let page = 1;

      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const users = data?.users ?? [];
        authUsers.push(
          ...users.map((u: any) => ({
            id: u.id,
            email: u.email ?? null,
            phone: u.phone ?? null,
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
            app_metadata: u.app_metadata ?? null,
            user_metadata: u.user_metadata ?? null,
          })),
        );

        const total = typeof data?.total === "number" ? data.total : authUsers.length;
        if (users.length < perPage || users.length === 0 || page * perPage >= total) break;
        page++;
      }
    } catch (e: any) {
      errors.push(`auth_users: ${e?.message ?? String(e)}`);
    }

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .limit(10000);

        if (error) {
          errors.push(`${table}: ${error.message}`);
          exportData[table] = [];
        } else {
          exportData[table] = data || [];
        }
      } catch (e: any) {
        errors.push(`${table}: ${e.message}`);
        exportData[table] = [];
      }
    }

    // Generate SQL INSERT statements for each table
    const generateInserts = (tableName: string, rows: any[]): string => {
      if (!rows || rows.length === 0) return `-- No data in ${tableName}\n`;

      const statements: string[] = [];
      statements.push(`-- ============================================`);
      statements.push(`-- TABLE: ${tableName} (${rows.length} rows)`);
      statements.push(`-- ============================================`);

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "number") return val.toString();
          if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        statements.push(
          `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`
        );
      }

      return statements.join("\n") + "\n\n";
    };

    // Build complete SQL backup
    let sqlBackup = `-- ============================================
-- USERVAULT COMPLETE DATABASE BACKUP
-- Generated: ${new Date().toISOString()}
-- Total Tables: ${tables.length}
-- ============================================
-- 
-- MIGRATION STEPS:
-- 1. Set up a fresh Supabase project
-- 2. Run all migrations from supabase/migrations/
-- 3. Run this SQL file to restore data
-- 4. Create storage buckets: avatars, backgrounds, badge-icons, audio, profile-assets
-- 5. Upload storage files manually or via script
-- ============================================

`;

    // Order matters - parent tables first
    const orderedTables = [
      "global_badges",      // Base badges (referenced by user_badges)
      "profiles",           // User profiles (referenced by many)
      "user_roles",         // User permissions
      "user_badges",        // Badge assignments
      "user_balances",      // Coin balances
      "user_streaks",       // Login streaks
      "social_links",       // Profile links
      "badges",             // Custom user badges
      "friend_badges",      // Friend-given badges
      "discord_integrations",
      "discord_presence",
      "purchases",
      "promo_codes",
      "promo_code_uses",
      "bot_commands",
      "bot_command_notifications",
      "daily_rewards",
      "minigame_stats",
      "badge_events",
      "badge_steals",
      "badge_requests",
      "admin_webhooks",
      "admin_notifications",
      "admin_discord_roles",
      "alias_requests",
      "marketplace_items",
      "marketplace_purchases",
      "support_tickets",
      "support_messages",
      "live_chat_conversations",
      "live_chat_messages",
      "user_notifications",
    ];

    for (const table of orderedTables) {
      if (exportData[table]) {
        sqlBackup += generateInserts(table, exportData[table]);
      }
    }

    // Summary
    const summary = {
      exported_at: new Date().toISOString(),
      tables_exported: Object.keys(exportData).length,
      total_rows: Object.values(exportData).reduce((sum, arr) => sum + (arr?.length || 0), 0),
      auth_users_exported: authUsers.length,
      table_counts: Object.fromEntries(
        Object.entries(exportData).map(([k, v]) => [k, v?.length || 0])
      ),
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Export complete:", summary);

    // Return both JSON and SQL
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        auth_users: authUsers,
        json_data: exportData,
        sql_backup: sqlBackup,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
