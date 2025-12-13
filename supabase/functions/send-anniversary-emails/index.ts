import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting anniversary email check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Find past sales with settlement anniversaries today
    const { data: pastSales, error: salesError } = await supabase
      .from("past_sales")
      .select(`
        id,
        address,
        suburb,
        settlement_date,
        sale_price,
        agent_id,
        team_id,
        vendor_details
      `)
      .not("settlement_date", "is", null)
      .neq("status", "withdrawn");

    if (salesError) {
      console.error("Error fetching past sales:", salesError);
      throw salesError;
    }

    if (!pastSales || pastSales.length === 0) {
      console.log("No past sales found");
      return new Response(
        JSON.stringify({ success: true, message: "No past sales to check", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter sales with anniversaries today
    const anniversarySales = pastSales.filter(sale => {
      const settlementDate = new Date(sale.settlement_date);
      return settlementDate.getMonth() === currentMonth && 
             settlementDate.getDate() === currentDay &&
             settlementDate.getFullYear() < today.getFullYear();
    });

    if (anniversarySales.length === 0) {
      console.log("No anniversaries today");
      return new Response(
        JSON.stringify({ success: true, message: "No anniversaries today", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${anniversarySales.length} sales with anniversaries today`);

    let emailsSent = 0;
    const errors: string[] = [];

    for (const sale of anniversarySales) {
      try {
        const settlementDate = new Date(sale.settlement_date);
        const yearsAgo = today.getFullYear() - settlementDate.getFullYear();
        
        // Only send for 1, 2, 5, and 10 year anniversaries
        if (![1, 2, 5, 10].includes(yearsAgo)) continue;

        // Get agent info
        if (!sale.agent_id) continue;
        
        const { data: agent, error: agentError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", sale.agent_id)
          .single();

        if (agentError || !agent?.email) {
          console.error(`Could not find agent for sale ${sale.id}`);
          continue;
        }

        // Skip demo users
        if (agent.email === "demo@agentbuddy.co") continue;

        // Check user preferences for anniversary emails
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("aftercare_email_enabled")
          .eq("user_id", agent.id)
          .single();

        if (prefs?.aftercare_email_enabled === false) {
          console.log(`Anniversary emails disabled for ${agent.email}`);
          continue;
        }

        // Get the appropriate email template
        const triggerEvent = `anniversary_${yearsAgo}yr`;
        const { data: template } = await supabase
          .from("communication_templates")
          .select("*")
          .eq("trigger_event", triggerEvent)
          .eq("is_default", true)
          .single();

        if (!template) {
          console.log(`No template found for ${triggerEvent}`);
          continue;
        }

        // Get vendor info
        const vendorFirstName = sale.vendor_details?.primary?.first_name || 'there';
        const vendorEmail = sale.vendor_details?.primary?.email;

        // If no vendor email, skip (can't send anniversary email)
        if (!vendorEmail) {
          console.log(`No vendor email for sale ${sale.id}`);
          continue;
        }

        // Replace variables in template
        const variables: Record<string, string> = {
          vendor_first_name: vendorFirstName,
          vendor_last_name: sale.vendor_details?.primary?.last_name || '',
          property_address: sale.address,
          suburb: sale.suburb || '',
          agent_name: agent.full_name || 'Your Agent',
          agent_first_name: agent.full_name?.split(' ')[0] || 'Your Agent',
          settlement_date: settlementDate.toLocaleDateString('en-NZ'),
          anniversary_date: today.toLocaleDateString('en-NZ'),
          years_since_settlement: yearsAgo.toString(),
          today: today.toLocaleDateString('en-NZ'),
          greeting: today.getHours() < 12 ? 'Good morning' : 'Good afternoon',
        };

        let subject = template.subject_template || 'Happy Anniversary!';
        let body = template.body_template;

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, value);
          body = body.replace(regex, value);
        });

        // Convert body to HTML (simple newline to br conversion)
        const htmlBody = body.replace(/\n/g, '<br>');

        // Send the email
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@agentbuddy.co";

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 ${yearsAgo} Year Anniversary</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 16px 16px;">
              <div style="font-size: 16px; line-height: 1.6;">
                ${htmlBody}
              </div>
            </div>
            
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Sent with ❤️ from ${agent.full_name || 'Your Agent'} via AgentBuddy
            </p>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: `${agent.full_name || 'AgentBuddy'} <${fromEmail}>`,
          to: [vendorEmail],
          subject,
          html: emailHtml,
          reply_to: agent.email,
        });

        if (emailError) {
          console.error(`Failed to send anniversary email:`, emailError);
          errors.push(`Failed to email ${vendorEmail}`);
          continue;
        }

        console.log(`Sent ${yearsAgo} year anniversary email to ${vendorEmail} for ${sale.address}`);
        emailsSent++;

        // Log the email send
        await supabase.from("audit_logs").insert({
          action: "anniversary_email_sent",
          user_id: agent.id,
          details: {
            past_sale_id: sale.id,
            vendor_email: vendorEmail,
            years: yearsAgo,
            template_id: template.id,
          },
        });

      } catch (saleError) {
        console.error(`Error processing sale ${sale.id}:`, saleError);
        errors.push(`Error processing sale ${sale.id}`);
      }
    }

    console.log(`Anniversary emails complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${emailsSent} anniversary emails`,
        count: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-anniversary-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
