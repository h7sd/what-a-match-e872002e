import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore - Deno module
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PremiumEmailRequest {
  email: string;
  username: string;
  orderId: string;
  amount: string;
  purchaseDate: string;
}

function generateInvoiceNumber(orderId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = orderId.substring(0, 8).toUpperCase();
  return `UV-${year}${month}-${shortId}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function generateInvoicePDF(
  invoiceNumber: string,
  orderId: string,
  username: string,
  email: string,
  amount: string,
  purchaseDate: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Colors
  const primaryColor = rgb(0.545, 0.361, 0.965); // Purple
  const darkColor = rgb(0.1, 0.1, 0.1);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Header - Company Logo/Name
  page.drawText('USERVAULT', {
    x: margin,
    y: y,
    size: 28,
    font: helveticaBold,
    color: primaryColor,
  });

  // Invoice label
  page.drawText('INVOICE', {
    x: width - margin - 100,
    y: y,
    size: 24,
    font: helveticaBold,
    color: darkColor,
  });

  y -= 40;

  // Company details
  page.drawText('UserVault Premium Services', {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  y -= 14;
  page.drawText('support@uservault.cc', {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  y -= 14;
  page.drawText('https://uservault.cc', {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });

  // Invoice details (right side)
  let rightY = height - margin - 40;
  const rightX = width - margin - 180;
  
  page.drawText('Invoice Number:', {
    x: rightX,
    y: rightY,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  page.drawText(invoiceNumber, {
    x: rightX + 90,
    y: rightY,
    size: 10,
    font: helveticaBold,
    color: darkColor,
  });

  rightY -= 16;
  page.drawText('Date:', {
    x: rightX,
    y: rightY,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  page.drawText(formatDate(purchaseDate), {
    x: rightX + 90,
    y: rightY,
    size: 10,
    font: helvetica,
    color: darkColor,
  });

  rightY -= 16;
  page.drawText('Status:', {
    x: rightX,
    y: rightY,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  page.drawText('PAID', {
    x: rightX + 90,
    y: rightY,
    size: 10,
    font: helveticaBold,
    color: rgb(0.133, 0.545, 0.133), // Green
  });

  // Divider line
  y -= 40;
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Bill To section
  y -= 30;
  page.drawText('BILL TO', {
    x: margin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: grayColor,
  });
  y -= 18;
  page.drawText(`@${username}`, {
    x: margin,
    y: y,
    size: 12,
    font: helveticaBold,
    color: darkColor,
  });
  y -= 16;
  page.drawText(email, {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });

  // Items table header
  y -= 50;
  const tableY = y;
  
  // Header background
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: width - 2 * margin,
    height: 25,
    color: rgb(0.96, 0.96, 0.98),
  });

  page.drawText('DESCRIPTION', {
    x: margin + 10,
    y: y,
    size: 9,
    font: helveticaBold,
    color: grayColor,
  });
  page.drawText('TYPE', {
    x: width - margin - 200,
    y: y,
    size: 9,
    font: helveticaBold,
    color: grayColor,
  });
  page.drawText('AMOUNT', {
    x: width - margin - 70,
    y: y,
    size: 9,
    font: helveticaBold,
    color: grayColor,
  });

  // Item row
  y -= 35;
  page.drawText('UserVault Premium', {
    x: margin + 10,
    y: y,
    size: 11,
    font: helveticaBold,
    color: darkColor,
  });
  y -= 14;
  page.drawText('Lifetime access to all premium features', {
    x: margin + 10,
    y: y,
    size: 9,
    font: helvetica,
    color: grayColor,
  });
  
  page.drawText('One-time', {
    x: width - margin - 200,
    y: y + 7,
    size: 10,
    font: helvetica,
    color: darkColor,
  });
  page.drawText(`€${amount}`, {
    x: width - margin - 60,
    y: y + 7,
    size: 11,
    font: helveticaBold,
    color: darkColor,
  });

  // Divider
  y -= 30;
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Totals
  y -= 25;
  page.drawText('Subtotal:', {
    x: width - margin - 150,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  page.drawText(`€${amount}`, {
    x: width - margin - 60,
    y: y,
    size: 10,
    font: helvetica,
    color: darkColor,
  });

  y -= 18;
  page.drawText('Tax (0%):', {
    x: width - margin - 150,
    y: y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  page.drawText('€0.00', {
    x: width - margin - 60,
    y: y,
    size: 10,
    font: helvetica,
    color: darkColor,
  });

  y -= 25;
  page.drawRectangle({
    x: width - margin - 170,
    y: y - 8,
    width: 170,
    height: 30,
    color: primaryColor,
  });
  page.drawText('TOTAL:', {
    x: width - margin - 150,
    y: y,
    size: 11,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`€${amount}`, {
    x: width - margin - 60,
    y: y,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // Payment info
  y -= 60;
  page.drawText('PAYMENT INFORMATION', {
    x: margin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: grayColor,
  });
  y -= 18;
  page.drawText(`Payment Method: PayPal`, {
    x: margin,
    y: y,
    size: 10,
    font: helvetica,
    color: darkColor,
  });
  y -= 14;
  page.drawText(`Transaction ID: ${orderId}`, {
    x: margin,
    y: y,
    size: 9,
    font: helvetica,
    color: lightGray,
  });

  // Features included
  y -= 40;
  page.drawText('WHAT\'S INCLUDED', {
    x: margin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: grayColor,
  });
  
  const features = [
    '- Advanced Themes & Animations',
    '- Exclusive Effects & Fonts',
    '- Custom Domain for your Profile',
    '- Premium Badge on your Profile',
    '- Lifetime Access - No recurring fees'
  ];
  
  y -= 18;
  for (const feature of features) {
    page.drawText(feature, {
      x: margin,
      y: y,
      size: 10,
      font: helvetica,
      color: darkColor,
    });
    y -= 16;
  }

  // Footer
  y = margin + 30;
  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: width - margin, y: y + 20 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });
  
  page.drawText('Thank you for your purchase!', {
    x: margin,
    y: y,
    size: 10,
    font: helveticaBold,
    color: primaryColor,
  });
  page.drawText('Questions? Contact us at support@uservault.cc', {
    x: margin,
    y: y - 14,
    size: 9,
    font: helvetica,
    color: lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function sendEmailWithAttachment(
  to: string, 
  subject: string, 
  html: string,
  pdfBytes: Uint8Array,
  invoiceNumber: string
) {
  console.log(`Sending premium confirmation email to: ${to}`);
  
  // Convert PDF to base64
  const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "UserVault <noreply@uservault.cc>",
      to: [to],
      subject,
      html,
      attachments: [
        {
          filename: `UserVault_Invoice_${invoiceNumber}.pdf`,
          content: pdfBase64,
        }
      ]
    }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Resend API error: ${res.status} - ${errorText}`);
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }
  
  const result = await res.json();
  console.log("Email sent successfully:", result);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, username, orderId, amount, purchaseDate }: PremiumEmailRequest = await req.json();

    if (!email || !orderId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const invoiceNumber = generateInvoiceNumber(orderId);
    const formattedDate = formatDate(purchaseDate);

    // Generate PDF Invoice
    console.log('Generating PDF invoice...');
    const pdfBytes = await generateInvoicePDF(
      invoiceNumber,
      orderId,
      username,
      email,
      amount,
      purchaseDate
    );
    console.log('PDF generated, size:', pdfBytes.length, 'bytes');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px 12px 0 0; padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">UserVault</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Premium Services</p>
                  </td>
                </tr>
                
                <!-- Success Badge -->
                <tr>
                  <td align="center" style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" style="margin-top: -20px;">
                      <tr>
                        <td style="background: #10b981; border-radius: 50px; padding: 12px 24px;">
                          <span style="color: #ffffff; font-weight: 600; font-size: 14px;">✓ Payment Successful</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Welcome Message -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h2 style="color: #1e293b; margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">
                      Welcome to Premium, @${username || 'User'}!
                    </h2>
                    <p style="color: #64748b; margin: 0; font-size: 15px; line-height: 1.6;">
                      Thank you for your purchase. Your premium features are now unlocked and ready to use.
                    </p>
                  </td>
                </tr>

                <!-- Order Summary -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <p style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Order Summary</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #475569; font-size: 14px; padding: 6px 0;">Invoice Number</td>
                              <td style="color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                            </tr>
                            <tr>
                              <td style="color: #475569; font-size: 14px; padding: 6px 0;">Date</td>
                              <td style="color: #1e293b; font-size: 14px; text-align: right;">${formattedDate}</td>
                            </tr>
                            <tr>
                              <td style="color: #475569; font-size: 14px; padding: 6px 0;">Product</td>
                              <td style="color: #1e293b; font-size: 14px; text-align: right;">Premium Lifetime</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px;"></td>
                            </tr>
                            <tr>
                              <td style="color: #1e293b; font-size: 16px; font-weight: 700; padding: 6px 0;">Total Paid</td>
                              <td style="color: #8b5cf6; font-size: 18px; font-weight: 700; text-align: right;">€${amount}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- PDF Notice -->
                <tr>
                  <td style="padding: 0 40px 20px 40px; text-align: center;">
                    <p style="color: #64748b; font-size: 13px; margin: 0; background: #fef3c7; padding: 12px 16px; border-radius: 6px; display: inline-block;">
                      📎 Your invoice is attached as a PDF to this email.
                    </p>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 10px 40px 30px 40px;">
                    <a href="https://uservault.cc/dashboard" style="display: inline-block; background: #8b5cf6; color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
                      Thank you for supporting UserVault!
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Questions? Contact us at <a href="mailto:support@uservault.cc" style="color: #8b5cf6;">support@uservault.cc</a>
                    </p>
                    <p style="color: #cbd5e1; font-size: 11px; margin: 16px 0 0 0;">
                      © ${new Date().getFullYear()} UserVault. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await sendEmailWithAttachment(
      email, 
      `Your UserVault Premium Invoice - ${invoiceNumber}`, 
      html,
      pdfBytes,
      invoiceNumber
    );

    return new Response(
      JSON.stringify({ success: true, invoiceNumber }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending premium email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
