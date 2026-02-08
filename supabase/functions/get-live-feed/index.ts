import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Fetch recent case transactions with user info
    const { data: transactions, error: txError } = await supabase
      .from('case_transactions')
      .select(`
        id,
        created_at,
        transaction_type,
        items_won,
        total_value,
        case_id,
        cases:case_id (
          name,
          image_url
        ),
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('transaction_type', 'open')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (txError) {
      console.error('Feed query error:', txError);
      throw new Error('Failed to fetch live feed');
    }

    // Transform data for frontend
    const feed = (transactions || []).map(tx => {
      const itemsWon = tx.items_won as Array<{
        item_type: string;
        rarity: string;
        display_value: number;
        badge?: { name: string; icon_url: string; color: string };
        coin_amount?: number;
      }> || [];
      
      const topItem = itemsWon[0];
      
      return {
        id: tx.id,
        created_at: tx.created_at,
        username: tx.profiles?.username || 'Anonymous',
        avatar_url: tx.profiles?.avatar_url,
        case_name: tx.cases?.name || 'Unknown Case',
        case_image: tx.cases?.image_url,
        item_type: topItem?.item_type || 'unknown',
        item_rarity: topItem?.rarity || 'common',
        item_value: topItem?.display_value || 0,
        item_name: topItem?.badge?.name || (topItem?.coin_amount ? `${topItem.coin_amount} Coins` : 'Unknown Item'),
        item_icon: topItem?.badge?.icon_url,
        item_color: topItem?.badge?.color,
      };
    });

    console.log(`Fetched ${feed.length} live feed entries`);

    return new Response(
      JSON.stringify({ success: true, feed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching live feed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
