import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateInvoiceNumber(orderId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = orderId.substring(0, 8).toUpperCase();
  return `UV-${year}${month}-${shortId}`;
}

const PREMIUM_PRICE = 3.50;
const CURRENCY = 'USD';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, promoCode, isFreePromo } = await req.json()
    
    if (!orderId) {
      console.error('Missing orderId in request')
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Verifying order:', orderId, 'Promo:', promoCode || 'none', 'Free:', isFreePromo || false)

    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Create client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      console.error('Failed to get user:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Update user's premium status using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Validate promo code if provided
    let promoDiscount = 0;
    let promoCodeId: string | null = null;
    let promoType = 'none';
    
    if (promoCode) {
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single()
      
      if (codeError || !codeData) {
        console.error('Invalid promo code:', promoCode)
        return new Response(
          JSON.stringify({ error: 'Invalid promo code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Promo code has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if max uses reached
      if (codeData.max_uses && codeData.uses_count >= codeData.max_uses) {
        return new Response(
          JSON.stringify({ error: 'Promo code has reached maximum uses' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if user already used this code
      const { data: existingUse } = await supabaseAdmin
        .from('promo_code_uses')
        .select('id')
        .eq('code_id', codeData.id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (existingUse) {
        return new Response(
          JSON.stringify({ error: 'You have already used this promo code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      promoDiscount = codeData.discount_percentage;
      promoCodeId = codeData.id;
      promoType = codeData.type;
      console.log('Valid promo code:', promoCode, 'Discount:', promoDiscount + '%')
    }
    
    // For free promo (100% discount), we need a valid 100% code
    if (isFreePromo && promoDiscount !== 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid free promo activation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if order was already processed (for paid orders)
    if (!isFreePromo) {
      const { data: existingOrder } = await supabaseAdmin
        .from('purchases')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()
      
      if (existingOrder) {
        console.log('Order already processed:', orderId)
        return new Response(
          JSON.stringify({ error: 'Order already processed', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get user's profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()

    const purchaseDate = new Date().toISOString()
    const invoiceNumber = generateInvoiceNumber(orderId)
    
    // Calculate final amount
    const finalAmount = isFreePromo ? 0 : (PREMIUM_PRICE * (1 - promoDiscount / 100));

    // Update user's profile to premium
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: true,
        premium_purchased_at: purchaseDate,
        paypal_order_id: orderId
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to activate premium' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Premium activated for user:', user.id)

    // Assign Premium badge to user
    const PREMIUM_BADGE_ID = '68f302c3-8b73-4791-9551-9b8435a8fd93';
    
    // Check if user already has the premium badge
    const { data: existingBadge } = await supabaseAdmin
      .from('user_badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('badge_id', PREMIUM_BADGE_ID)
      .maybeSingle()
    
    if (!existingBadge) {
      const { error: badgeError } = await supabaseAdmin
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: PREMIUM_BADGE_ID,
        })
      
      if (badgeError) {
        console.error('Failed to assign premium badge:', badgeError)
        // Don't fail the whole request, premium is already activated
      } else {
        console.log('Premium badge assigned to user:', user.id)
      }
    }

    // Record promo code use if applicable
    if (promoCodeId) {
      // Record the use
      await supabaseAdmin
        .from('promo_code_uses')
        .insert({
          code_id: promoCodeId,
          user_id: user.id,
        })
      
      // Get current uses count and increment
      const { data: currentCode } = await supabaseAdmin
        .from('promo_codes')
        .select('uses_count')
        .eq('id', promoCodeId)
        .single()
      
      if (currentCode) {
        await supabaseAdmin
          .from('promo_codes')
          .update({ uses_count: (currentCode.uses_count || 0) + 1 })
          .eq('id', promoCodeId)
      }
      
      console.log('Promo code use recorded for:', promoCode)
    }

    // Record the purchase in the purchases table
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: user.id,
        username: profile?.username || 'Unknown',
        email: user.email || 'Unknown',
        order_id: orderId,
        amount: finalAmount,
        currency: CURRENCY,
        payment_method: isFreePromo ? 'Promo Code' : 'PayPal',
        invoice_number: invoiceNumber,
        status: 'completed'
      })

    if (purchaseError) {
      console.error('Failed to record purchase:', purchaseError)
      // Don't fail the whole request, premium is already activated
    } else {
      console.log('Purchase recorded:', invoiceNumber)
    }

    // Assign Discord Premium role if user has linked Discord
    try {
      const discordRoleResponse = await fetch(`${supabaseUrl}/functions/v1/assign-discord-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          action: 'add_premium_role',
          userId: user.id,
        }),
      })

      if (discordRoleResponse.ok) {
        const roleResult = await discordRoleResponse.json()
        if (roleResult.success) {
          console.log('Discord premium role assigned successfully')
        } else {
          console.log('Discord role not assigned:', roleResult.error || 'No Discord linked')
        }
      }
    } catch (discordError) {
      console.error('Error assigning Discord role:', discordError)
      // Don't fail the whole request if Discord role fails
    }

    // Send confirmation email with invoice
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-premium-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          username: profile?.username || 'User',
          orderId: orderId,
          amount: finalAmount.toFixed(2),
          purchaseDate: purchaseDate,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Failed to send premium email:', await emailResponse.text())
      } else {
        console.log('Premium confirmation email sent successfully')
      }
    } catch (emailError) {
      console.error('Error sending premium email:', emailError)
      // Don't fail the whole request if email fails
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Premium activated!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})