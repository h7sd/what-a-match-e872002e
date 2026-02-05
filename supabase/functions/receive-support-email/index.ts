import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookData {
  email_id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

interface ResendEmailContent {
  html: string | null;
  text: string | null;
}

// Fetch full email content from Resend API using email_id
async function fetchEmailContent(emailId: string): Promise<string> {
  try {
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch email content:", response.status, await response.text());
      return "Could not retrieve email content";
    }

    const emailData: ResendEmailContent = await response.json();
    console.log("Fetched email content:", { 
      hasHtml: !!emailData.html, 
      hasText: !!emailData.text,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0
    });

    // Prefer plain text, fall back to HTML (strip tags for display)
    if (emailData.text && emailData.text.trim()) {
      return emailData.text.trim();
    }
    
    if (emailData.html && emailData.html.trim()) {
      // Strip HTML tags for plain text display
      return emailData.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return "No content";
  } catch (error) {
    console.error("Error fetching email content:", error);
    return "Error retrieving email content";
  }
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
    
    // Resend webhooks have type and data fields
    const webhookType = rawPayload.type;
    const emailData: ResendWebhookData = rawPayload.data;
    
    console.log("Webhook type:", webhookType);
    console.log("Parsed email data:", {
      email_id: emailData?.email_id,
      from: emailData?.from,
      to: emailData?.to,
      subject: emailData?.subject,
    });

    // Only process email.received events
    if (webhookType !== "email.received") {
      console.log("Ignoring non-received event:", webhookType);
      return new Response(
        JSON.stringify({ success: true, message: "Event ignored" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate required fields
    if (!emailData?.from || !emailData?.email_id) {
      console.error("Missing required fields in payload");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    // Fetch the actual email content using the Resend API
    const messageContent = await fetchEmailContent(emailData.email_id);
    console.log("Email content retrieved, length:", messageContent.length);

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

    // Create support ticket with actual email content
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        email: senderEmail,
        subject: emailData.subject || "No Subject",
        message: messageContent,
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
        message: messageContent,
        sender_type: "user",
        sender_id: matchedUser?.id || null,
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
    }

    console.log("Support ticket created:", ticket.id, "with content length:", messageContent.length);

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
