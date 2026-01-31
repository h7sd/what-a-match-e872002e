import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get PayPal Client ID from environment
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    
    if (!clientId) {
      console.error('PAYPAL_CLIENT_ID not configured')
      return new Response(
        JSON.stringify({ error: 'PayPal not configured', clientId: 'sb' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Returning PayPal Client ID')
    
    return new Response(
      JSON.stringify({ clientId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting PayPal config:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', clientId: 'sb' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
