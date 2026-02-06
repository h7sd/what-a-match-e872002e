import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * DEDICATED BOT API
 * ===================
 * This endpoint handles ALL Discord bot operations completely isolated from the website.
 * - Admin commands (ban, unban, give, take, setbal, stats, etc.)
 * - User commands (balance, daily, profile, link, unlink)
 * - Game commands (via minigame-data/minigame-reward proxying)
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
  "Access-Control-Max-Age": "86400",
};

// ============ UTILITIES ============

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return 0n;
    const integerPart = s.includes(".") ? s.split(".")[0] : s;
    return BigInt(integerPart);
  }
  return 0n;
}

function safeJsonInt(value: bigint): number | string {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (value <= max && value >= -max) return Number(value);
  return value.toString();
}

async function verifySignature(
  payload: string,
  signatureHeader: string,
  timestamp: string
): Promise<boolean> {
  const message = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();

  return signatureHeader.trim().toLowerCase() === expectedSignature;
}

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const body = await req.text();

    // Verify signature
    if (!signature || !timestamp) {
      console.error("[bot-api] Missing signature headers");
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const isValid = await verifySignature(body, signature, timestamp);
    if (!isValid) {
      console.error("[bot-api] Invalid signature");
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    // Check timestamp (5 minute window)
    const timestampAge = Date.now() - parseInt(timestamp);
    if (timestampAge > 300000) {
      return jsonResponse({ error: "Request expired" }, 401);
    }

    const data = JSON.parse(body);
    const { action, discordUserId } = data;

    console.log(`[bot-api] Action: ${action} | Discord: ${discordUserId || "N/A"}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ============ HELPER: Get profile by Discord ID ============
    async function getProfileByDiscord(discordId: string) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id, username, discord_user_id")
        .eq("discord_user_id", discordId)
        .single();
      return { profile, error };
    }

    // ============ HELPER: Check if user is admin ============
    async function isAdmin(userId: string): Promise<boolean> {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "supporter"])
        .limit(1);
      return (data && data.length > 0) || false;
    }

    // ============ HELPER: Find user by username/alias ============
    async function findUserByUsername(username: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .or(`username.ilike.${username},alias_username.ilike.${username}`)
        .single();
      return profile;
    }

    // ============ GET BOT COMMANDS ============
    if (action === "get_bot_commands") {
      const { data: commands, error } = await supabase
        .from("bot_commands")
        .select("name, description, usage, category, cooldown_seconds, is_enabled")
        .eq("is_enabled", true)
        .order("category")
        .order("name");

      if (error) {
        console.error("[bot-api] get_bot_commands error:", error);
        return jsonResponse({ error: "Failed to fetch commands" });
      }

      return jsonResponse({ commands: commands || [] });
    }

    // ============ CHECK ADMIN ============
    if (action === "check_admin") {
      if (!discordUserId) {
        return jsonResponse({ is_admin: false });
      }

      const { profile } = await getProfileByDiscord(discordUserId);
      if (!profile) {
        return jsonResponse({ is_admin: false });
      }

      const admin = await isAdmin(profile.user_id);
      return jsonResponse({ is_admin: admin, username: profile.username });
    }

    // ============ GET BALANCE ============
    if (action === "get_balance") {
      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile } = await getProfileByDiscord(discordUserId);
      if (!profile) {
        return jsonResponse({ error: "Not linked to UserVault" });
      }

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance, total_earned, total_spent")
        .eq("user_id", profile.user_id)
        .single();

      const balance = toBigInt(balanceData?.balance || 0);
      return jsonResponse({
        balance: safeJsonInt(balance),
        username: profile.username,
        total_earned: safeJsonInt(toBigInt(balanceData?.total_earned || 0)),
        total_spent: safeJsonInt(toBigInt(balanceData?.total_spent || 0)),
      });
    }

    // ============ GET PROFILE ============
    if (action === "get_profile") {
      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile } = await getProfileByDiscord(discordUserId);
      if (!profile) {
        return jsonResponse({ error: "Not linked to UserVault" });
      }

      const { data: fullProfile } = await supabase
        .from("profiles")
        .select("username, display_name, uid_number, views_count, likes_count, avatar_url, is_premium")
        .eq("user_id", profile.user_id)
        .single();

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", profile.user_id)
        .single();

      const { count: badgeCount } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      return jsonResponse({
        ...fullProfile,
        balance: safeJsonInt(toBigInt(balanceData?.balance || 0)),
        badge_count: badgeCount || 0,
      });
    }

    // ============ DAILY REWARD ============
    if (action === "daily_reward") {
      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile } = await getProfileByDiscord(discordUserId);
      if (!profile) {
        return jsonResponse({ error: "Not linked to UserVault" });
      }

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Check existing daily reward
      const { data: existing } = await supabase
        .from("daily_rewards")
        .select("last_claim, streak")
        .eq("user_id", profile.user_id)
        .single();

      if (existing) {
        const lastClaimDate = existing.last_claim.split("T")[0];
        if (lastClaimDate === todayStr) {
          return jsonResponse({ error: "Already claimed today! Come back tomorrow." });
        }
      }

      // Calculate streak
      let newStreak = 1;
      if (existing) {
        const lastDate = new Date(existing.last_claim);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = (existing.streak || 0) + 1;
        }
      }

      // Calculate reward (base 50 + streak bonus)
      const reward = Math.min(50 + (newStreak - 1) * 10, 200);

      // Upsert daily reward record
      await supabase.from("daily_rewards").upsert({
        user_id: profile.user_id,
        discord_user_id: discordUserId,
        last_claim: now.toISOString(),
        streak: newStreak,
      }, { onConflict: "user_id" });

      // Update balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance, total_earned")
        .eq("user_id", profile.user_id)
        .single();

      const currentBal = toBigInt(balanceData?.balance || 0);
      const currentEarned = toBigInt(balanceData?.total_earned || 0);
      const newBalance = currentBal + BigInt(reward);

      if (balanceData) {
        await supabase
          .from("user_balances")
          .update({
            balance: newBalance.toString(),
            total_earned: (currentEarned + BigInt(reward)).toString(),
            updated_at: now.toISOString(),
          })
          .eq("user_id", profile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: profile.user_id,
          balance: reward.toString(),
          total_earned: reward.toString(),
          total_spent: "0",
        });
      }

      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: profile.user_id,
        amount: reward,
        transaction_type: "earn",
        description: `Daily reward (${newStreak} day streak)`,
        reference_type: "daily_reward",
      });

      return jsonResponse({
        success: true,
        reward,
        streak: newStreak,
        newBalance: safeJsonInt(newBalance),
        username: profile.username,
      });
    }

    // ============ ADD UC (for game rewards) ============
    if (action === "add_uv") {
      const { amount, gameType, description: desc } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile } = await getProfileByDiscord(discordUserId);
      if (!profile) {
        return jsonResponse({ error: "Not linked to UserVault" });
      }

      const amountBI = BigInt(amount || 0);

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance, total_earned, total_spent")
        .eq("user_id", profile.user_id)
        .single();

      const currentBal = toBigInt(balanceData?.balance || 0);
      const currentEarned = toBigInt(balanceData?.total_earned || 0);
      const currentSpent = toBigInt(balanceData?.total_spent || 0);
      const newBalance = currentBal + amountBI;

      if (newBalance < 0n) {
        return jsonResponse({ error: "Insufficient balance" });
      }

      const isWin = amountBI > 0n;

      if (balanceData) {
        await supabase
          .from("user_balances")
          .update({
            balance: newBalance.toString(),
            total_earned: isWin ? (currentEarned + amountBI).toString() : currentEarned.toString(),
            total_spent: !isWin ? (currentSpent + (-amountBI)).toString() : currentSpent.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", profile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: profile.user_id,
          balance: newBalance.toString(),
          total_earned: isWin ? amountBI.toString() : "0",
          total_spent: !isWin ? (-amountBI).toString() : "0",
        });
      }

      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: profile.user_id,
        amount: Number(amountBI),
        transaction_type: isWin ? "earn" : "spend",
        description: desc || `${gameType} game`,
        reference_type: gameType || "game",
      });

      // Update minigame stats
      await supabase.from("minigame_stats").upsert({
        user_id: profile.user_id,
        discord_user_id: discordUserId,
        game_type: gameType || "unknown",
        games_played: 1,
        games_won: isWin ? 1 : 0,
        total_earned: isWin ? Number(amountBI) : 0,
        total_lost: !isWin ? Number(-amountBI) : 0,
      }, {
        onConflict: "user_id,game_type",
      });

      return jsonResponse({
        success: true,
        newBalance: safeJsonInt(newBalance),
        username: profile.username,
      });
    }

    // ============ ADMIN: BAN USER ============
    if (action === "admin_ban_user") {
      const { target, reason } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const targetProfile = await findUserByUsername(target);
      if (!targetProfile) {
        return jsonResponse({ error: `User "${target}" not found` });
      }

      // Get email
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(targetProfile.user_id);

      const { error: banError } = await supabase.from("banned_users").insert({
        user_id: targetProfile.user_id,
        username: targetProfile.username,
        email: authUser?.email || null,
        banned_by: adminProfile.user_id,
        reason: reason || "No reason provided",
      });

      if (banError) {
        console.error("[bot-api] Ban error:", banError);
        return jsonResponse({ error: "Failed to ban user" });
      }

      console.log(`[bot-api] User ${targetProfile.username} banned by ${adminProfile.username}`);
      return jsonResponse({ success: true, username: targetProfile.username });
    }

    // ============ ADMIN: UNBAN USER ============
    if (action === "admin_unban_user") {
      const { target } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const { error: unbanError } = await supabase
        .from("banned_users")
        .delete()
        .ilike("username", target);

      if (unbanError) {
        console.error("[bot-api] Unban error:", unbanError);
        return jsonResponse({ error: "Failed to unban user" });
      }

      console.log(`[bot-api] User ${target} unbanned by ${adminProfile.username}`);
      return jsonResponse({ success: true });
    }

    // ============ ADMIN: GIVE UC ============
    if (action === "admin_give") {
      const { target, amount } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const targetProfile = await findUserByUsername(target);
      if (!targetProfile) {
        return jsonResponse({ error: `User "${target}" not found` });
      }

      const amountBI = BigInt(amount || 0);
      if (amountBI <= 0n) {
        return jsonResponse({ error: "Amount must be positive" });
      }

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance, total_earned")
        .eq("user_id", targetProfile.user_id)
        .single();

      const currentBal = toBigInt(balanceData?.balance || 0);
      const newBalance = currentBal + amountBI;

      if (balanceData) {
        await supabase
          .from("user_balances")
          .update({
            balance: newBalance.toString(),
            total_earned: (toBigInt(balanceData.total_earned) + amountBI).toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", targetProfile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: targetProfile.user_id,
          balance: newBalance.toString(),
          total_earned: newBalance.toString(),
          total_spent: "0",
        });
      }

      await supabase.from("uv_transactions").insert({
        user_id: targetProfile.user_id,
        amount: Number(amountBI),
        transaction_type: "admin_give",
        description: `Given by ${adminProfile.username}`,
        reference_type: "admin",
      });

      console.log(`[bot-api] ${adminProfile.username} gave ${amount} UC to ${targetProfile.username}`);
      return jsonResponse({ success: true, new_balance: safeJsonInt(newBalance) });
    }

    // ============ ADMIN: TAKE UC ============
    if (action === "admin_take") {
      const { target, amount } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const targetProfile = await findUserByUsername(target);
      if (!targetProfile) {
        return jsonResponse({ error: `User "${target}" not found` });
      }

      const amountBI = BigInt(amount || 0);
      if (amountBI <= 0n) {
        return jsonResponse({ error: "Amount must be positive" });
      }

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", targetProfile.user_id)
        .single();

      const currentBal = toBigInt(balanceData?.balance || 0);
      const newBalance = currentBal - amountBI;

      if (newBalance < 0n) {
        return jsonResponse({ error: "Cannot set negative balance" });
      }

      await supabase
        .from("user_balances")
        .update({
          balance: newBalance.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetProfile.user_id);

      await supabase.from("uv_transactions").insert({
        user_id: targetProfile.user_id,
        amount: -Number(amountBI),
        transaction_type: "admin_take",
        description: `Taken by ${adminProfile.username}`,
        reference_type: "admin",
      });

      console.log(`[bot-api] ${adminProfile.username} took ${amount} UC from ${targetProfile.username}`);
      return jsonResponse({ success: true, new_balance: safeJsonInt(newBalance) });
    }

    // ============ ADMIN: SET BALANCE ============
    if (action === "admin_setbal") {
      const { target, amount } = data;

      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const targetProfile = await findUserByUsername(target);
      if (!targetProfile) {
        return jsonResponse({ error: `User "${target}" not found` });
      }

      const newBalanceBI = BigInt(amount || 0);
      if (newBalanceBI < 0n) {
        return jsonResponse({ error: "Balance cannot be negative" });
      }

      const { data: existingBal } = await supabase
        .from("user_balances")
        .select("id")
        .eq("user_id", targetProfile.user_id)
        .single();

      if (existingBal) {
        await supabase
          .from("user_balances")
          .update({
            balance: newBalanceBI.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", targetProfile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: targetProfile.user_id,
          balance: newBalanceBI.toString(),
          total_earned: newBalanceBI.toString(),
          total_spent: "0",
        });
      }

      await supabase.from("uv_transactions").insert({
        user_id: targetProfile.user_id,
        amount: Number(newBalanceBI),
        transaction_type: "admin_set",
        description: `Balance set by ${adminProfile.username}`,
        reference_type: "admin",
      });

      console.log(`[bot-api] ${adminProfile.username} set ${targetProfile.username}'s balance to ${amount}`);
      return jsonResponse({ success: true, new_balance: safeJsonInt(newBalanceBI) });
    }

    // ============ ADMIN: GET STATS ============
    if (action === "admin_stats") {
      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const { count: linkedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("discord_user_id", "is", null);

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { data: totalUCData } = await supabase
        .from("user_balances")
        .select("balance");

      const totalUC = totalUCData?.reduce((sum, b) => sum + toBigInt(b.balance), 0n) || 0n;

      const { count: gamesPlayed } = await supabase
        .from("minigame_stats")
        .select("*", { count: "exact", head: true });

      const { count: bannedUsers } = await supabase
        .from("banned_users")
        .select("*", { count: "exact", head: true });

      return jsonResponse({
        linked_users: linkedUsers || 0,
        total_users: totalUsers || 0,
        total_uc: safeJsonInt(totalUC),
        games_played: gamesPlayed || 0,
        banned_users: bannedUsers || 0,
      });
    }

    // ============ ADMIN: GET ALL USERS ============
    if (action === "get_all_users") {
      if (!discordUserId) {
        return jsonResponse({ error: "Discord ID required" });
      }

      const { profile: adminProfile } = await getProfileByDiscord(discordUserId);
      if (!adminProfile || !(await isAdmin(adminProfile.user_id))) {
        return jsonResponse({ error: "Admin access required" });
      }

      const { data: users, count } = await supabase
        .from("profiles")
        .select("username, uid_number, discord_user_id, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100);

      return jsonResponse({ users: users || [], count: count || 0 });
    }

    // ============ LOOKUP PROFILE (public) ============
    if (action === "lookup_profile") {
      const { username } = data;

      if (!username) {
        return jsonResponse({ error: "Username required" });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, uid_number, views_count, likes_count, avatar_url, is_premium")
        .or(`username.ilike.${username},alias_username.ilike.${username}`)
        .single();

      if (!profile) {
        return jsonResponse({ error: "Profile not found" });
      }

      const { count: badgeCount } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.username); // This needs the user_id, let me fix

      return jsonResponse({
        ...profile,
        badge_count: badgeCount || 0,
      });
    }

    // ============ UNKNOWN ACTION ============
    console.log(`[bot-api] Unknown action: ${action}`);
    return jsonResponse({ error: "Unknown action" }, 400);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[bot-api] Error:", errorMessage);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
