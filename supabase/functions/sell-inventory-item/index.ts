import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // User-scoped client for auth validation
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

    // Admin client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { itemIds, sellAll } = await req.json();

    if (!sellAll && (!itemIds || itemIds.length === 0)) {
      throw new Error('Item IDs required');
    }

    // Get profile ID first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      throw new Error('Profile query failed');
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    const profileId = profile.id;

    // Build query for inventory items (user_inventory uses profiles.id as FK)
    let query = supabase
      .from('user_inventory')
      .select('id, estimated_value')
      .eq('user_id', profileId)
      .eq('sold', false);

    if (!sellAll) {
      query = query.in('id', itemIds);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      console.error('Items query error:', itemsError);
      throw new Error('Failed to fetch items');
    }

    if (!items || items.length === 0) {
      throw new Error('No items found to sell');
    }

    const totalValue = items.reduce((sum, item) => sum + toBigInt(item.estimated_value), 0n);

    // Get current balance from user_balances
    let { data: balanceRow, error: balanceRowError } = await supabase
      .from('user_balances')
      .select('balance, total_earned, total_spent')
      .eq('user_id', user.id)
      .maybeSingle();

    if (balanceRowError) {
      console.error('Balance query error:', balanceRowError);
      throw new Error('Balance query failed');
    }

    if (!balanceRow) {
      // Initialize balance row if it doesn't exist
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
    const newBalance = currentBalance + totalValue;
    const newTotalEarned = totalEarned + totalValue;

    // Update balance
    const { error: balanceError } = await supabase
      .from('user_balances')
      .update({
        balance: newBalance.toString(),
        total_earned: newTotalEarned.toString(),
      })
      .eq('user_id', user.id);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      throw new Error('Failed to update balance');
    }

    // Mark items as sold
    const itemIdsToUpdate = items.map(item => item.id);

    const { error: updateError } = await supabase
      .from('user_inventory')
      .update({ sold: true, sold_at: new Date().toISOString() })
      .in('id', itemIdsToUpdate);

    if (updateError) {
      console.error('Inventory update error:', updateError);
      throw new Error('Failed to mark items as sold');
    }

    console.log(`User ${user.id} sold ${items.length} items for ${totalValue.toString()} coins`);

    return new Response(
      JSON.stringify({
        success: true,
        itemsSold: items.length,
        coinsEarned: totalValue.toString(),
        newBalance: newBalance.toString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error selling items:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
