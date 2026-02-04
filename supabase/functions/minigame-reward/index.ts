import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

// Verify HMAC signature from Discord bot
async function verifySignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
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
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const body = await req.text();

    // Verify signature
    if (!signature || !timestamp || !(await verifySignature(body, signature, timestamp))) {
      console.error("Invalid signature");
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

    const { action, discordUserId, amount, gameType, description } = JSON.parse(body);

    console.log(`Minigame action: ${action} for Discord user ${discordUserId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
      // First, get current balance
      const { data: currentBalance } = await supabase
        .from("user_balances")
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single();

      if (currentBalance) {
        // Update existing balance by ADDING the amount
        const newBalanceValue = currentBalance.balance + amount;
        const newTotalEarned = amount > 0 
          ? currentBalance.total_earned + amount 
          : currentBalance.total_earned;

        await supabase
          .from("user_balances")
          .update({
            balance: newBalanceValue,
            total_earned: newTotalEarned,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        // No balance exists - create new record
        await supabase
          .from("user_balances")
          .insert({
            user_id: userId,
            balance: amount > 0 ? amount : 0,
            total_earned: amount > 0 ? amount : 0,
            total_spent: 0,
          });
      }

      // Log transaction
      await supabase.from("uv_transactions").insert({
        user_id: userId,
        amount: amount,
        transaction_type: amount > 0 ? "earn" : "spend",
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
        await supabase
          .from("minigame_stats")
          .update({
            games_played: existingStats.games_played + 1,
            games_won: existingStats.games_won + (amount > 0 ? 1 : 0),
            total_earned: existingStats.total_earned + (amount > 0 ? amount : 0),
            total_lost: existingStats.total_lost + (amount < 0 ? Math.abs(amount) : 0),
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
            games_won: amount > 0 ? 1 : 0,
            total_earned: amount > 0 ? amount : 0,
            total_lost: amount < 0 ? Math.abs(amount) : 0,
          });
      }

      // Get final balance
      const { data: newBalance } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", userId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          amount,
          newBalance: newBalance?.balance || 0,
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

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          balance: balance?.balance || 0,
          totalEarned: balance?.total_earned || 0,
          totalSpent: balance?.total_spent || 0,
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

        // Add UV
        await supabase
          .from("user_balances")
          .update({
            balance: (await supabase.from("user_balances").select("balance").eq("user_id", userId).single()).data?.balance + reward,
            total_earned: (await supabase.from("user_balances").select("total_earned").eq("user_id", userId).single()).data?.total_earned + reward,
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId);

        await supabase.from("uv_transactions").insert({
          user_id: userId,
          amount: reward,
          transaction_type: "earn",
          description: `Daily reward (${newStreak} day streak)`,
          reference_type: "daily_reward",
        });

        const { data: newBalance } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", userId)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            username: profile.username,
            reward,
            streak: newStreak,
            newBalance: newBalance?.balance || 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // First claim
        const reward = 50;
        
        await supabase.from("daily_rewards").insert({
          user_id: userId,
          discord_user_id: discordUserId,
          streak: 1,
          last_claim: now.toISOString(),
        });

        // Add UV
        const { data: currentBalance } = await supabase
          .from("user_balances")
          .select("balance, total_earned")
          .eq("user_id", userId)
          .single();

        await supabase
          .from("user_balances")
          .update({
            balance: (currentBalance?.balance || 0) + reward,
            total_earned: (currentBalance?.total_earned || 0) + reward,
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId);

        await supabase.from("uv_transactions").insert({
          user_id: userId,
          amount: reward,
          transaction_type: "earn",
          description: "Daily reward (1 day streak)",
          reference_type: "daily_reward",
        });

        const { data: newBalance } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", userId)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            username: profile.username,
            reward,
            streak: 1,
            newBalance: newBalance?.balance || 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
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
