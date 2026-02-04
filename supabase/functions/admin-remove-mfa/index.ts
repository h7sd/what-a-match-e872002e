import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    console.log(`Removing MFA factors for user: ${userId}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // List all MFA factors for the user
    const { data, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId
    });

    if (listError) {
      console.error("Error listing MFA factors:", listError);
      throw listError;
    }

    const allFactors = data?.factors || [];
    console.log(`Found ${allFactors.length} MFA factor(s)`);

    // Delete all factors
    const deletedFactors: string[] = [];
    
    for (const factor of allFactors) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId,
        id: factor.id
      });

      if (deleteError) {
        console.error(`Error deleting factor ${factor.id}:`, deleteError);
      } else {
        deletedFactors.push(factor.id);
        console.log(`Deleted factor: ${factor.id} (type: ${factor.factor_type})`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedFactors,
        message: `Removed ${deletedFactors.length} MFA factor(s)` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error removing MFA:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
