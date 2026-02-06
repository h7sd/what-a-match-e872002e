import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

let loggedWebhookFingerprint = false;
let webhookFingerprintCache: string | null = null;

// Numeric columns may be returned as strings depending on DB types.
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
  const min = -max;
  if (value <= max && value >= min) return Number(value);
  return value.toString();
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getWebhookSecretFingerprint(): Promise<string> {
  if (webhookFingerprintCache) return webhookFingerprintCache;
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(webhookSecret));
  // Only log a short fingerprint (non-reversible) to help debug secret mismatches safely.
  webhookFingerprintCache = toHex(digest).slice(0, 12);
  return webhookFingerprintCache;
}

// Verify HMAC signature from Discord bot
async function verifySignature(
  payload: string,
  signatureHeader: string,
  timestamp: string,
): Promise<{ ok: boolean; expected: string }> {
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

  const provided = signatureHeader.trim().toLowerCase();
  return { ok: provided === expectedSignature, expected: expectedSignature };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const body = await req.text();

     // Log a safe fingerprint of the configured secret once per instance.
     if (!loggedWebhookFingerprint) {
       try {
         const fp = await getWebhookSecretFingerprint();
         console.log(`[minigame-reward] webhook secret fingerprint sha256:${fp}`);
       } catch (e) {
         console.warn("[minigame-reward] could not compute webhook fingerprint", e);
       }
       loggedWebhookFingerprint = true;
     }

    // Verify signature
    if (!signature || !timestamp) {
      console.error("Invalid signature (missing headers)", {
        hasSignature: Boolean(signature),
        hasTimestamp: Boolean(timestamp),
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const verification = await verifySignature(body, signature, timestamp);
    if (!verification.ok) {
      console.error("Invalid signature", {
        timestamp,
        receivedSigPrefix: signature.trim().slice(0, 12),
        expectedSigPrefix: verification.expected.slice(0, 12),
        bodyPrefix: body.slice(0, 160),
        bodyLength: body.length,
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check timestamp (5 minute window)
    const timestampAge = Date.now() - parseInt(timestamp);
    if (timestampAge > 300000) {
      return new Response(JSON.stringify({ error: "Request expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { action, discordUserId, amount, gameType, description, username } = JSON.parse(body);

    console.log(`Minigame action: ${action} for Discord user ${discordUserId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ============ LINK ACCOUNT ============
    if (action === "link_account") {
      if (!username) {
        return new Response(
          JSON.stringify({ error: "Username is required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if Discord is already linked
      const { data: existingLink } = await supabase
        .from("profiles")
        .select("username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: `Already linked to ${existingLink.username}. Use /unlink first.` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find profile by username
      const { data: targetProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id, username, discord_user_id")
        .ilike("username", username)
        .single();

      if (profileErr || !targetProfile) {
        return new Response(
          JSON.stringify({ error: `User "${username}" not found on UserVault` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (targetProfile.discord_user_id && targetProfile.discord_user_id !== discordUserId) {
        return new Response(
          JSON.stringify({ error: "This UserVault account is already linked to another Discord" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Link the account
      await supabase
        .from("profiles")
        .update({ discord_user_id: discordUserId })
        .eq("user_id", targetProfile.user_id);

      return new Response(
        JSON.stringify({ success: true, username: targetProfile.username }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ UNLINK ACCOUNT ============
    if (action === "unlink_account") {
      const { data: linkedProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (!linkedProfile) {
        return new Response(
          JSON.stringify({ error: "Your Discord is not linked to any UserVault account" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase
        .from("profiles")
        .update({ discord_user_id: null })
        .eq("discord_user_id", discordUserId);

      return new Response(
        JSON.stringify({ success: true, message: `Unlinked from ${linkedProfile.username}` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ DELETE ACCOUNT ============
    if (action === "delete_account") {
      // Find linked profile
      const { data: linkedProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (!linkedProfile) {
        return new Response(
          JSON.stringify({ error: "Your Discord is not linked to any UserVault account" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const userId = linkedProfile.user_id;
      console.log(`[delete_account] Deleting data for user ${userId} (${linkedProfile.username})`);

      // Delete user balances
      await supabase.from("user_balances").delete().eq("user_id", userId);

      // Delete transactions
      await supabase.from("uv_transactions").delete().eq("user_id", userId);

      // Delete minigame stats
      await supabase.from("minigame_stats").delete().eq("user_id", userId);

      // Delete daily rewards
      await supabase.from("daily_rewards").delete().eq("user_id", userId);

      // Unlink Discord from profile (don't delete the profile itself)
      await supabase
        .from("profiles")
        .update({ discord_user_id: null })
        .eq("user_id", userId);

      console.log(`[delete_account] Successfully deleted data for ${linkedProfile.username}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Account data for ${linkedProfile.username} has been deleted` 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ CHECK ADMIN ============
    if (action === "check_admin") {
      // Check if Discord user is admin or supporter on UserVault
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (!profile) {
        console.log(`[check_admin] Discord user ${discordUserId} not linked to any profile`);
        return new Response(
          JSON.stringify({ is_admin: false, is_supporter: false, error: "Discord not linked" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[check_admin] Found profile: ${profile.username} (${profile.user_id})`);

      // Check if user has admin role using the has_role RPC function
      const { data: hasAdminRole, error: adminError } = await supabase.rpc("has_role", {
        _user_id: profile.user_id,
        _role: "admin",
      });

      // Also check supporter role
      const { data: hasSupporterRole, error: supporterError } = await supabase.rpc("has_role", {
        _user_id: profile.user_id,
        _role: "supporter",
      });

      if (adminError || supporterError) {
        console.error("Error checking roles:", adminError || supporterError);
        return new Response(
          JSON.stringify({ is_admin: false, is_supporter: false, error: "Failed to check role" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[check_admin] User ${profile.username}: admin=${hasAdminRole}, supporter=${hasSupporterRole}`);

      return new Response(
        JSON.stringify({ 
          is_admin: hasAdminRole === true,
          is_supporter: hasSupporterRole === true,
          username: profile.username 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ GET ALL REGISTERED USERS (Admin Only) ============
    if (action === "get_all_users") {
      // Check if Discord user is admin
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (!adminProfile) {
        return new Response(
          JSON.stringify({ error: "Discord not linked" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: adminProfile.user_id,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch all profiles with username and uid
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select("username, uid_number")
        .order("uid_number", { ascending: true });

      if (usersError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          users: allUsers || [],
          count: allUsers?.length || 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ GET PROFILE ============
    if (action === "get_profile") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("discord_user_id", discordUserId)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "Discord not linked. Use /link <username> first!" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: balance } = await supabase
        .from("user_balances")
        .select("balance, total_earned")
        .eq("user_id", profile.user_id)
        .single();

      const balanceBI = toBigInt(balance?.balance);
      const earnedBI = toBigInt(balance?.total_earned);

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          balance: safeJsonInt(balanceBI),
          totalEarned: safeJsonInt(earnedBI),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ REQUIRE LINKED ACCOUNT FOR OTHER ACTIONS ============
    // Find user by discord_user_id in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("discord_user_id", discordUserId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Discord account not linked. Use /link command first!" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = profile.user_id;

    if (action === "add_uv") {
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || !Number.isInteger(amountNum)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      const amountBI = BigInt(amountNum);

      // First, get current balance
      const { data: currentBalance } = await supabase
        .from("user_balances")
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single();

      if (currentBalance) {
        const currentBalanceBI = toBigInt(currentBalance.balance);
        const currentEarnedBI = toBigInt(currentBalance.total_earned);

        // Update existing balance by ADDING the amount
        const newBalanceValue = currentBalanceBI + amountBI;
        
        // CRITICAL: Prevent negative balance
        if (newBalanceValue < 0n) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Insufficient balance - cannot go negative",
              currentBalance: safeJsonInt(currentBalanceBI),
              requested: safeJsonInt(amountBI),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const newTotalEarned = amountBI > 0n
          ? currentEarnedBI + amountBI
          : currentEarnedBI;

        await supabase
          .from("user_balances")
          .update({
            balance: newBalanceValue.toString(),
            total_earned: newTotalEarned.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        // No balance exists - create new record
        await supabase
          .from("user_balances")
          .insert({
            user_id: userId,
            balance: (amountBI > 0n ? amountBI : 0n).toString(),
            total_earned: (amountBI > 0n ? amountBI : 0n).toString(),
            total_spent: 0,
          });
      }

      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: userId,
        amount: amountBI.toString(),
        transaction_type: amountBI > 0n ? "earn" : "spend",
        description: description || `Minigame: ${gameType}`,
        reference_type: "minigame",
      });

      // Update minigame stats - use proper increment logic
      const { data: existingStats } = await supabase
        .from("minigame_stats")
        .select("games_played, games_won, total_earned, total_lost")
        .eq("discord_user_id", discordUserId)
        .eq("game_type", gameType)
        .single();

      if (existingStats) {
        const statsEarnedBI = toBigInt(existingStats.total_earned);
        const statsLostBI = toBigInt(existingStats.total_lost);
        await supabase
          .from("minigame_stats")
          .update({
            games_played: existingStats.games_played + 1,
            games_won: existingStats.games_won + (amountBI > 0n ? 1 : 0),
            total_earned: (statsEarnedBI + (amountBI > 0n ? amountBI : 0n)).toString(),
            total_lost: (statsLostBI + (amountBI < 0n ? -amountBI : 0n)).toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("discord_user_id", discordUserId)
          .eq("game_type", gameType);
      } else {
        await supabase
          .from("minigame_stats")
          .insert({
            discord_user_id: discordUserId,
            user_id: userId,
            game_type: gameType,
            games_played: 1,
            games_won: amountBI > 0n ? 1 : 0,
            total_earned: (amountBI > 0n ? amountBI : 0n).toString(),
            total_lost: (amountBI < 0n ? -amountBI : 0n).toString(),
          });
      }

      // Get final balance
      const { data: newBalance } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", userId)
        .single();

      const newBalanceBI = toBigInt(newBalance?.balance);

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          amount: safeJsonInt(amountBI),
          newBalance: safeJsonInt(newBalanceBI),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "get_balance") {
      const { data: balance } = await supabase
        .from("user_balances")
        .select("balance, total_earned, total_spent")
        .eq("user_id", userId)
        .single();

      const balanceBI = toBigInt(balance?.balance);
      const earnedBI = toBigInt(balance?.total_earned);
      const spentBI = toBigInt(balance?.total_spent);

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          balance: safeJsonInt(balanceBI),
          totalEarned: safeJsonInt(earnedBI),
          totalSpent: safeJsonInt(spentBI),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "daily_reward") {
      // Check last claim
      const { data: lastClaim } = await supabase
        .from("daily_rewards")
        .select("*")
        .eq("discord_user_id", discordUserId)
        .single();

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      if (lastClaim) {
        const lastClaimDate = new Date(lastClaim.last_claim).toISOString().split("T")[0];
        
        if (lastClaimDate === today) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Already claimed today!",
              nextClaim: new Date(now.setDate(now.getDate() + 1)).setHours(0, 0, 0, 0),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check streak
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        const newStreak = lastClaimDate === yesterdayStr ? lastClaim.streak + 1 : 1;
        const reward = Math.min(50 + (newStreak - 1) * 10, 200); // 50-200 UV based on streak

        // Update daily rewards
        await supabase
          .from("daily_rewards")
          .update({
            streak: newStreak,
            last_claim: now.toISOString(),
          })
          .eq("discord_user_id", discordUserId);

        // Add UV (single read + safe numeric handling)
        const { data: balRow } = await supabase
          .from("user_balances")
          .select("balance, total_earned")
          .eq("user_id", userId)
          .single();

        const rewardBI = BigInt(reward);
        let finalBalance: bigint;

        if (balRow) {
          // Update existing balance
          const balBI = toBigInt(balRow.balance);
          const earnedBI = toBigInt(balRow.total_earned);
          finalBalance = balBI + rewardBI;

          await supabase
            .from("user_balances")
            .update({
              balance: finalBalance.toString(),
              total_earned: (earnedBI + rewardBI).toString(),
              updated_at: now.toISOString(),
            })
            .eq("user_id", userId);
        } else {
          // No balance record exists - create one
          console.log(`Creating missing balance record for returning user ${userId}`);
          finalBalance = rewardBI;
          
          await supabase.from("user_balances").insert({
            user_id: userId,
            balance: finalBalance.toString(),
            total_earned: finalBalance.toString(),
            total_spent: "0",
          });
        }

        await supabase.from("uv_transactions").insert({
          user_id: userId,
          amount: reward,
          transaction_type: "earn",
          description: `Daily reward (${newStreak} day streak)`,
          reference_type: "daily_reward",
        });

        // Verify final balance
        const { data: newBalance } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", userId)
          .single();

        const newBalanceBI = newBalance ? toBigInt(newBalance.balance) : finalBalance;
        
        console.log(`Daily reward for ${profile.username}: streak=${newStreak}, reward=${reward}, newBalance=${newBalanceBI}`);

        return new Response(
          JSON.stringify({
            success: true,
            username: profile.username,
            reward,
            streak: newStreak,
            newBalance: safeJsonInt(newBalanceBI),
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // First claim
        const reward = 50;
        const rewardBI = BigInt(reward);
        
        console.log(`First daily claim for user ${userId} (Discord: ${discordUserId})`);
        
        await supabase.from("daily_rewards").insert({
          user_id: userId,
          discord_user_id: discordUserId,
          streak: 1,
          last_claim: now.toISOString(),
        });

        // Check if balance exists
        const { data: currentBalance } = await supabase
          .from("user_balances")
          .select("balance, total_earned")
          .eq("user_id", userId)
          .single();

        let finalBalance: bigint;

        if (!currentBalance) {
          console.log(`Creating new balance record for user ${userId}`);
          // Create new balance record
          const { error: insertError } = await supabase.from("user_balances").insert({
            user_id: userId,
            balance: rewardBI.toString(),
            total_earned: rewardBI.toString(),
            total_spent: "0",
          });
          
          if (insertError) {
            console.error(`Failed to insert balance for user ${userId}:`, insertError);
          }
          
          finalBalance = rewardBI;
        } else {
          const balBI = toBigInt(currentBalance.balance);
          const earnedBI = toBigInt(currentBalance.total_earned);
          finalBalance = balBI + rewardBI;
          
          console.log(`Updating balance for user ${userId}: ${balBI} + ${rewardBI} = ${finalBalance}`);
          
          await supabase
            .from("user_balances")
            .update({
              balance: finalBalance.toString(),
              total_earned: (earnedBI + rewardBI).toString(),
              updated_at: now.toISOString(),
            })
            .eq("user_id", userId);
        }

        await supabase.from("uv_transactions").insert({
          user_id: userId,
          amount: reward,
          transaction_type: "earn",
          description: "Daily reward (1 day streak)",
          reference_type: "daily_reward",
        });

        // Verify the final balance from DB (for consistency)
        const { data: verifyBalance, error: verifyError } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", userId)
          .single();

        if (verifyError) {
          console.error(`Failed to verify balance for user ${userId}:`, verifyError);
        }

        // Use the computed finalBalance as fallback if DB read fails
        const newBalanceBI = verifyBalance ? toBigInt(verifyBalance.balance) : finalBalance;
        
        console.log(`Daily reward complete for ${profile.username}: reward=${reward}, newBalance=${newBalanceBI}`);

        return new Response(
          JSON.stringify({
            success: true,
            username: profile.username,
            reward,
            streak: 1,
            newBalance: safeJsonInt(newBalanceBI),
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ============ ADMIN: BAN USER ============
    if (action === "admin_ban_user") {
      const { target, reason } = JSON.parse(body);
      
      // Check if caller is admin
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_user_id", discordUserId)
        .single();
      
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Not linked to UserVault" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerProfile.user_id)
        .in("role", ["admin", "supporter"])
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Find target user
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .or(`username.ilike.${target},alias_username.ilike.${target}`)
        .single();
      
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: `User "${target}" not found` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Get email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(targetProfile.user_id);
      
      // Insert ban record
      const { error: banError } = await supabase.from("banned_users").insert({
        user_id: targetProfile.user_id,
        username: targetProfile.username,
        email: authUser?.email || null,
        banned_by: callerProfile.user_id,
        reason: reason || "No reason provided",
      });
      
      if (banError) {
        console.error("Ban error:", banError);
        return new Response(
          JSON.stringify({ error: "Failed to ban user" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, username: targetProfile.username }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ ADMIN: UNBAN USER ============
    if (action === "admin_unban_user") {
      const { target } = JSON.parse(body);
      
      // Check admin
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_user_id", discordUserId)
        .single();
      
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Not linked to UserVault" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerProfile.user_id)
        .in("role", ["admin", "supporter"])
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Find and delete ban
      const { error: unbanError } = await supabase
        .from("banned_users")
        .delete()
        .ilike("username", target);
      
      if (unbanError) {
        console.error("Unban error:", unbanError);
        return new Response(
          JSON.stringify({ error: "Failed to unban user" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ ADMIN: ADJUST BALANCE ============
    if (action === "admin_adjust_balance") {
      const parsedBody = JSON.parse(body);
      const { target, amount: adjustAmount } = parsedBody;
      
      // Check admin
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_user_id", discordUserId)
        .single();
      
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Not linked to UserVault" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerProfile.user_id)
        .in("role", ["admin", "supporter"])
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Find target user
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .or(`username.ilike.${target},alias_username.ilike.${target}`)
        .single();
      
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: `User "${target}" not found` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Get current balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", targetProfile.user_id)
        .single();
      
      const currentBal = toBigInt(balanceData?.balance || 0);
      const adjustBI = BigInt(adjustAmount);
      const newBalance = currentBal + adjustBI;
      
      if (newBalance < 0n) {
        return new Response(
          JSON.stringify({ error: "Cannot set negative balance" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Update balance
      if (balanceData) {
        await supabase
          .from("user_balances")
          .update({ balance: newBalance.toString(), updated_at: new Date().toISOString() })
          .eq("user_id", targetProfile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: targetProfile.user_id,
          balance: newBalance.toString(),
          total_earned: adjustBI > 0n ? adjustBI.toString() : "0",
          total_spent: "0",
        });
      }
      
      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: targetProfile.user_id,
        amount: Number(adjustBI),
        transaction_type: adjustBI >= 0n ? "admin_give" : "admin_take",
        description: `Admin adjustment by ${callerProfile.user_id}`,
        reference_type: "admin",
      });
      
      return new Response(
        JSON.stringify({ success: true, new_balance: safeJsonInt(newBalance) }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ ADMIN: SET BALANCE ============
    if (action === "admin_set_balance") {
      const parsedBody = JSON.parse(body);
      const { target, amount: setAmount } = parsedBody;
      
      // Check admin
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_user_id", discordUserId)
        .single();
      
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Not linked to UserVault" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerProfile.user_id)
        .in("role", ["admin", "supporter"])
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Find target user
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .or(`username.ilike.${target},alias_username.ilike.${target}`)
        .single();
      
      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: `User "${target}" not found` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const newBalanceBI = BigInt(setAmount);
      
      // Upsert balance
      const { data: existingBal } = await supabase
        .from("user_balances")
        .select("id")
        .eq("user_id", targetProfile.user_id)
        .single();
      
      if (existingBal) {
        await supabase
          .from("user_balances")
          .update({ balance: newBalanceBI.toString(), updated_at: new Date().toISOString() })
          .eq("user_id", targetProfile.user_id);
      } else {
        await supabase.from("user_balances").insert({
          user_id: targetProfile.user_id,
          balance: newBalanceBI.toString(),
          total_earned: newBalanceBI.toString(),
          total_spent: "0",
        });
      }
      
      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: targetProfile.user_id,
        amount: Number(newBalanceBI),
        transaction_type: "admin_set",
        description: `Balance set to ${setAmount} by admin`,
        reference_type: "admin",
      });
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ ADMIN: GET BOT STATS ============
    if (action === "get_bot_stats") {
      // Check admin
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_user_id", discordUserId)
        .single();
      
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Not linked to UserVault" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerProfile.user_id)
        .in("role", ["admin", "supporter"])
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Get stats
      const { count: linkedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("discord_user_id", "is", null);
      
      const { data: totalUCData } = await supabase
        .from("user_balances")
        .select("balance");
      
      const totalUC = totalUCData?.reduce((sum, b) => sum + toBigInt(b.balance), 0n) || 0n;
      
      const { count: gamesPlayed } = await supabase
        .from("minigame_stats")
        .select("*", { count: "exact", head: true });
      
      return new Response(
        JSON.stringify({
          linked_users: linkedUsers || 0,
          total_uc: safeJsonInt(totalUC),
          games_played: gamesPlayed || 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Minigame error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
