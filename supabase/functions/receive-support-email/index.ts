import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, svix-id, svix-timestamp, svix-signature",
};

interface ResendEmailData {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  created_at?: string;
  headers?: Array<{ name: string; value: string }>;
}

interface ResendWebhookPayload {
  type: string;
  data: ResendEmailData;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the incoming webhook from Resend
    const rawPayload = await req.json();
    
    console.log("Raw webhook payload:", JSON.stringify(rawPayload));
    
    // Resend webhooks wrap email data in a "data" object
    // Handle both direct email format and webhook format
    const emailData: ResendEmailData = rawPayload.data || rawPayload;
    
    console.log("Parsed email data:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Validate required fields
    if (!emailData.from) {
      console.error("Missing 'from' field in payload");
      return new Response(
        JSON.stringify({ error: "Missing 'from' field" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only process emails sent to support@uservault.cc
    const toAddresses = emailData.to || [];
    const isSupportEmail = toAddresses.some(
      (addr: string) => addr.toLowerCase().includes('support@uservault.cc')
    );

    if (!isSupportEmail) {
      console.log("Email not addressed to support@uservault.cc, ignoring:", toAddresses);
      return new Response(
        JSON.stringify({ success: true, message: "Email ignored - not addressed to support" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract sender email from "Name <email@domain.com>" format
    const fromMatch = emailData.from.match(/<([^>]+)>/) || [null, emailData.from];
    const senderEmail = fromMatch[1] || emailData.from;

    // Try to find user by email
    const { data: userData } = await supabase.auth.admin.listUsers();
    const matchedUser = userData?.users?.find(
      (u) => u.email?.toLowerCase() === senderEmail.toLowerCase()
    );

    let username = null;
    if (matchedUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", matchedUser.id)
        .single();
      username = profileData?.username;
    }

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        email: senderEmail,
        subject: emailData.subject || "No Subject",
        message: emailData.text || emailData.html || "No content",
        user_id: matchedUser?.id || null,
        username: username,
        status: "open",
      })
      .select("id")
      .single();

    if (ticketError) {
      console.error("Error creating ticket:", ticketError);
      throw new Error("Failed to create support ticket");
    }

    // Also store the initial message
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        message: emailData.text || emailData.html || "No content",
        sender_type: "user",
        sender_id: matchedUser?.id || null,
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
    }

    console.log("Support ticket created:", ticket.id);

    return new Response(
      JSON.stringify({ success: true, ticketId: ticket.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
