import { createClient } from "npm:@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// All remaining user IDs from README
const remainingUserIds = [
  "d3e4271e-938f-4975-be85-fff34ad8039a",
  "77296c65-4ef7-416d-a6ae-412cc7fe4980",
  "ddf1e879-48f6-4d73-a953-0c88d00dcd0e",
  "3416759e-7f70-4ca6-a434-71a92c5be8e4",
  "6a1c2896-23b1-4602-90ce-a583c53a35e6",
  "4df043ff-bf02-4e2f-b7d0-2c9ebcb43e42",
  "24e8339f-4790-433e-87ef-980042ace6d8",
  "383c5cb5-677a-428b-a2f1-13776d039b71",
  "8e013192-2b64-4529-bbad-62001d39de89",
  "818f3578-4827-48ae-9825-f7be61e5ead4",
  "348f3732-7e70-4f35-a940-c8aa9828f402",
  "7fe98c39-7ce7-4cb0-88a4-10982c98c23f",
  "3ab27b06-94ea-44cc-94fd-5e96ae34cfc8",
  "aa170eca-6cde-440a-8d49-7e5a73d3aaa3",
  "8aa323a6-d5e1-42e1-9cc4-6411c58b44d3",
  "492b93d0-0c77-4ab3-a07a-b6b7d3ca700a",
  "8af50902-26c8-4726-aca8-2761b5a81a4e",
  "727a357d-8c03-45c2-bcdf-9b95a46da490",
  "cae19a8d-fc3d-49b9-ba7b-b8fe20e77c69",
  "1225323d-41d3-404d-b50c-a5d187759571",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Importing ${remainingUserIds.length} remaining user profiles...`);

    // Batch insert in groups of 500
    const batchSize = 500;
    let imported = 0;

    for (let i = 0; i < remainingUserIds.length; i += batchSize) {
      const batch = remainingUserIds.slice(i, i + batchSize);

      const profilesData = batch.map(user_id => ({
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("profiles")
        .insert(profilesData);

      if (error) {
        console.error(`Error importing batch starting at ${i}:`, error);
        return new Response(
          JSON.stringify({ error: error.message, imported }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      imported += batch.length;
      console.log(`Imported ${imported}/${remainingUserIds.length}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        message: `Successfully imported ${imported} profiles`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
