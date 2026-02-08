import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CaseItem {
  id: string;
  item_type: 'badge' | 'coins';
  badge_id: string | null;
  coin_amount: number | null;
  rarity: string;
  drop_rate: number;
  display_value: number;
  badge?: {
    name: string;
    icon_url: string;
    color: string;
  };
}

function toBigInt(value: unknown): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') return BigInt(value);
  return BigInt(String(value));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice('Bearer '.length);

    // User-scoped client for auth validation (RLS-aware)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client (bypasses RLS) for reads/writes
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { caseId } = await req.json();

    if (!caseId) {
      throw new Error('Case ID is required');
    }

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('active', true)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found or inactive');
    }

    // Fetch profile (needed because inventory/transactions reference profiles.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      throw new Error('Profile query failed: ' + profileError.message);
    }

    if (!profile) {
      throw new Error('Profile not found for user: ' + user.id);
    }

    const profileId = profile.id;

    // Fetch UC balance from user_balances
    let { data: balanceRow, error: balanceRowError } = await supabase
      .from('user_balances')
      .select('balance, total_earned, total_spent')
      .eq('user_id', user.id)
      .maybeSingle();

    if (balanceRowError) {
      console.error('Balance query error:', balanceRowError);
      throw new Error('Balance query failed: ' + balanceRowError.message);
    }

    if (!balanceRow) {
      // Initialize a 0-balance row (avoid "not found" errors)
      const { data: created, error: createErr } = await supabase
        .from('user_balances')
        .insert({ user_id: user.id, balance: 0, total_earned: 0, total_spent: 0 })
        .select('balance, total_earned, total_spent')
        .single();

      if (createErr || !created) {
        console.error('Balance init error:', createErr);
        throw new Error('Failed to initialize balance');
      }

      balanceRow = created;
    }

    const currentBalance = toBigInt(balanceRow.balance);
    const totalEarned = toBigInt(balanceRow.total_earned);
    const totalSpent = toBigInt(balanceRow.total_spent);
    const casePrice = toBigInt(caseData.price);

    if (currentBalance < casePrice) {
      throw new Error('Insufficient coins');
    }

    // Get case items
    const { data: items, error: itemsError } = await supabase
      .from('case_items')
      .select(`
        id,
        item_type,
        badge_id,
        coin_amount,
        rarity,
        drop_rate,
        display_value,
        badges:badge_id (
          name,
          icon_url,
          color
        )
      `)
      .eq('case_id', caseId);

    if (itemsError || !items || items.length === 0) {
      throw new Error('No items found in case');
    }

    // Calculate random drop
    const totalDropRate = items.reduce((sum, item) => sum + parseFloat(item.drop_rate.toString()), 0);
    const random = Math.random() * totalDropRate;

    let cumulativeRate = 0;
    let wonItem: CaseItem | null = null;

    for (const item of items) {
      cumulativeRate += parseFloat(item.drop_rate.toString());
      if (random <= cumulativeRate) {
        wonItem = item as CaseItem;
        break;
      }
    }

    if (!wonItem) {
      wonItem = items[items.length - 1] as CaseItem;
    }

    // Deduct case price (and track spend)
    const balanceAfterOpen = currentBalance - casePrice;
    const spentAfterOpen = totalSpent + casePrice;

    const { error: deductError } = await supabase
      .from('user_balances')
      .update({
        balance: balanceAfterOpen.toString(),
        total_spent: spentAfterOpen.toString(),
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Balance deduct error:', deductError);
      throw new Error('Failed to deduct coins');
    }

    let resultingBalance = balanceAfterOpen;

    // Add coins if won (and track earned)
    if (wonItem.item_type === 'coins' && wonItem.coin_amount) {
      const wonCoins = toBigInt(wonItem.coin_amount);
      resultingBalance = balanceAfterOpen + wonCoins;

      const { error: creditError } = await supabase
        .from('user_balances')
        .update({
          balance: resultingBalance.toString(),
          total_earned: (totalEarned + wonCoins).toString(),
        })
        .eq('user_id', user.id);

      if (creditError) {
        console.error('Balance credit error:', creditError);
        throw new Error('Failed to credit coins');
      }
    }

    // Add to inventory (FK -> profiles.id)
    const { error: inventoryError } = await supabase
      .from('user_inventory')
      .insert({
        user_id: profileId,
        item_type: wonItem.item_type,
        badge_id: wonItem.badge_id,
        coin_amount: wonItem.coin_amount,
        rarity: wonItem.rarity,
        estimated_value: wonItem.display_value,
        won_from_case_id: caseId,
      });

    if (inventoryError) {
      console.error('Inventory error:', inventoryError);
    }

    // Prepare item data for response and transaction
    const itemWonData = {
      id: wonItem.id,
      item_type: wonItem.item_type,
      badge_id: wonItem.badge_id,
      coin_amount: wonItem.coin_amount,
      rarity: wonItem.rarity,
      display_value: wonItem.display_value,
      badge: wonItem.badge,
    };

    // Save transaction to case_transactions (FK -> profiles.id)
    const { error: transactionError } = await supabase
      .from('case_transactions')
      .insert({
        user_id: profileId,
        case_id: caseId,
        transaction_type: 'open',
        items_won: [itemWonData],
        total_value: wonItem.display_value,
      });

    if (transactionError) {
      console.error('Transaction save error:', transactionError);
    }

    console.log(`User ${user.id} opened case ${caseId}, won: ${wonItem.item_type}`);

    return new Response(
      JSON.stringify({
        success: true,
        item: itemWonData,
        newBalance: resultingBalance.toString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error opening case:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
