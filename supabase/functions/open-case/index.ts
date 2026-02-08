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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

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

    // Get user profile with balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('uc_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const currentBalance = BigInt(profile.uc_balance || 0);
    const casePrice = BigInt(caseData.price);

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

    // Deduct case price
    const newBalance = currentBalance - casePrice;

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ uc_balance: newBalance.toString() })
      .eq('id', user.id);

    if (balanceError) {
      throw new Error('Failed to deduct coins');
    }

    // Add coins if won
    if (wonItem.item_type === 'coins' && wonItem.coin_amount) {
      const finalBalance = newBalance + BigInt(wonItem.coin_amount);
      await supabase
        .from('profiles')
        .update({ uc_balance: finalBalance.toString() })
        .eq('id', user.id);
    }

    // Add to inventory
    const { error: inventoryError } = await supabase
      .from('user_inventory')
      .insert({
        user_id: user.id,
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

    // Save transaction to case_transactions
    const { error: transactionError } = await supabase
      .from('case_transactions')
      .insert({
        user_id: user.id,
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
        newBalance: wonItem.item_type === 'coins'
          ? (newBalance + BigInt(wonItem.coin_amount || 0)).toString()
          : newBalance.toString(),
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
