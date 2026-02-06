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

    // Generate CREATE TABLE schema for each table
    const generateSchema = async (): Promise<string> => {
      const schemaStatements: string[] = [];
      schemaStatements.push(`-- ============================================`);
      schemaStatements.push(`-- USERVAULT DATABASE SCHEMA EXPORT`);
      schemaStatements.push(`-- Generated: ${new Date().toISOString()}`);
      schemaStatements.push(`-- ============================================`);
      schemaStatements.push(`-- `);
      schemaStatements.push(`-- IMPORTANT: Run this FIRST before importing data!`);
      schemaStatements.push(`-- This creates all tables, types, functions, and triggers.`);
      schemaStatements.push(`-- ============================================\n`);

      // Create app_role enum type
      schemaStatements.push(`-- Create custom types`);
      schemaStatements.push(`DO $$ BEGIN`);
      schemaStatements.push(`  CREATE TYPE public.app_role AS ENUM ('admin', 'supporter', 'user');`);
      schemaStatements.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
      schemaStatements.push(`END $$;\n`);

      // Fetch column info for each table
      for (const tableName of orderedTables) {
        try {
          const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
          
          if (error || !columns || columns.length === 0) {
            // Fallback: generate schema from first row if RPC fails
            const rows = exportData[tableName];
            if (rows && rows.length > 0) {
              const firstRow = rows[0];
              schemaStatements.push(`-- TABLE: ${tableName} (generated from data)`);
              schemaStatements.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
              
              const colDefs = Object.entries(firstRow).map(([col, val]) => {
                let type = 'text';
                if (val === null) type = 'text';
                else if (typeof val === 'boolean') type = 'boolean';
                else if (typeof val === 'number') type = Number.isInteger(val) ? 'integer' : 'numeric';
                else if (typeof val === 'object') type = 'jsonb';
                else if (col === 'id') type = 'uuid DEFAULT gen_random_uuid() PRIMARY KEY';
                else if (col.endsWith('_id')) type = 'uuid';
                else if (col.endsWith('_at') || col === 'created_at' || col === 'updated_at') type = 'timestamp with time zone DEFAULT now()';
                
                if (col === 'id') return `  ${col} uuid DEFAULT gen_random_uuid() PRIMARY KEY`;
                return `  ${col} ${type}`;
              });
              
              schemaStatements.push(colDefs.join(',\n'));
              schemaStatements.push(`);\n`);
            }
            continue;
          }

          schemaStatements.push(`-- TABLE: ${tableName}`);
          schemaStatements.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
          
          const colDefs = columns.map((col: any) => {
            let def = `  ${col.column_name} ${col.data_type}`;
            if (col.column_default) {
              def += ` DEFAULT ${col.column_default}`;
            }
            if (col.is_nullable === 'NO') {
              def += ' NOT NULL';
            }
            return def;
          });
          
          schemaStatements.push(colDefs.join(',\n'));
          schemaStatements.push(`);\n`);
        } catch (e) {
          schemaStatements.push(`-- Could not generate schema for ${tableName}\n`);
        }
      }

      // Add RLS enable statements
      schemaStatements.push(`\n-- Enable Row Level Security on all tables`);
      for (const tableName of orderedTables) {
        schemaStatements.push(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`);
      }

      // Add essential functions
      schemaStatements.push(`\n-- Essential security functions`);
      schemaStatements.push(`CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)`);
      schemaStatements.push(`RETURNS boolean`);
      schemaStatements.push(`LANGUAGE sql`);
      schemaStatements.push(`STABLE`);
      schemaStatements.push(`SECURITY DEFINER`);
      schemaStatements.push(`SET search_path = public`);
      schemaStatements.push(`AS $$`);
      schemaStatements.push(`  SELECT EXISTS (`);
      schemaStatements.push(`    SELECT 1`);
      schemaStatements.push(`    FROM public.user_roles`);
      schemaStatements.push(`    WHERE user_id = _user_id`);
      schemaStatements.push(`      AND role = _role`);
      schemaStatements.push(`  )`);
      schemaStatements.push(`$$;\n`);

      schemaStatements.push(`CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_id uuid)`);
      schemaStatements.push(`RETURNS boolean`);
      schemaStatements.push(`LANGUAGE sql`);
      schemaStatements.push(`STABLE`);
      schemaStatements.push(`SECURITY DEFINER`);
      schemaStatements.push(`SET search_path = public`);
      schemaStatements.push(`AS $$`);
      schemaStatements.push(`  SELECT EXISTS (`);
      schemaStatements.push(`    SELECT 1`);
      schemaStatements.push(`    FROM public.profiles p`);
      schemaStatements.push(`    WHERE p.id = profile_id`);
      schemaStatements.push(`      AND p.user_id = auth.uid()`);
      schemaStatements.push(`  )`);
      schemaStatements.push(`$$;\n`);

      // Storage buckets
      schemaStatements.push(`\n-- Storage buckets`);
      schemaStatements.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;`);
      schemaStatements.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT DO NOTHING;`);
      schemaStatements.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('badge-icons', 'badge-icons', true) ON CONFLICT DO NOTHING;`);
      schemaStatements.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT DO NOTHING;`);
      schemaStatements.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true) ON CONFLICT DO NOTHING;`);

      return schemaStatements.join('\n');
    };

    // Generate schema export
    const schemaBackup = await generateSchema();

    // Build complete SQL backup (data only)
    let sqlBackup = `-- ============================================
-- USERVAULT DATA BACKUP (INSERT STATEMENTS)
-- Generated: ${new Date().toISOString()}
-- Total Tables: ${tables.length}
-- ============================================
-- 
-- IMPORTANT: Run the SCHEMA export FIRST!
-- Then run this file to restore all data.
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
      table_counts: Object.fromEntries(
        Object.entries(exportData).map(([k, v]) => [k, v?.length || 0])
      ),
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Export complete:", summary);

    // Return JSON, SQL data, and schema
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        json_data: exportData,
        sql_backup: sqlBackup,
        schema_backup: schemaBackup,
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
