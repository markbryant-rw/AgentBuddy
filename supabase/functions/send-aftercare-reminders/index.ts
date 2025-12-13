import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface AftercareTask {
  id: string;
  title: string;
  due_date: string;
  assigned_to: string;
  aftercare_year: number;
  past_sale_id: string;
}

interface PastSaleInfo {
  address: string;
  vendor_name: string;
  settlement_date: string;
}

interface AgentInfo {
  id: string;
  email: string;
  full_name: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting aftercare reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tasks due in 3 days that haven't been reminded yet
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const targetDateStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Looking for aftercare tasks due on: ${targetDateStr}`);

    // Get aftercare tasks due in 3 days
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        assigned_to,
        aftercare_year,
        past_sale_id,
        reminder_sent_at
      `)
      .eq("due_date", targetDateStr)
      .eq("completed", false)
      .not("past_sale_id", "is", null)
      .is("reminder_sent_at", null);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No aftercare tasks need reminders today");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to send", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tasks.length} aftercare tasks to remind`);

    // Group tasks by agent
    const tasksByAgent = new Map<string, AftercareTask[]>();
    tasks.forEach((task: any) => {
      if (task.assigned_to) {
        const existing = tasksByAgent.get(task.assigned_to) || [];
        existing.push(task);
        tasksByAgent.set(task.assigned_to, existing);
      }
    });

    let emailsSent = 0;
    let errors: string[] = [];

    // Process each agent
    for (const [agentId, agentTasks] of tasksByAgent) {
      try {
        // Get agent info
        const { data: agent, error: agentError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", agentId)
          .single();

        if (agentError || !agent?.email) {
          console.error(`Could not find agent ${agentId}:`, agentError);
          continue;
        }

        // Check if demo user - skip email
        if (agent.email === "demo@agentbuddy.co") {
          console.log("Skipping email for demo user");
          continue;
        }

        // Get past sale details for each task
        const pastSaleIds = [...new Set(agentTasks.map(t => t.past_sale_id))];
        const { data: pastSales, error: salesError } = await supabase
          .from("past_sales")
          .select("id, address, vendor_details, settlement_date")
          .in("id", pastSaleIds);

        if (salesError) {
          console.error(`Error fetching past sales:`, salesError);
          continue;
        }

        const pastSaleMap = new Map(pastSales?.map(ps => [ps.id, ps]) || []);

        // Build email content
        const taskDetails = agentTasks.map(task => {
          const pastSale = pastSaleMap.get(task.past_sale_id);
          const vendorName = pastSale?.vendor_details?.primary 
            ? `${pastSale.vendor_details.primary.first_name || ''} ${pastSale.vendor_details.primary.last_name || ''}`.trim()
            : 'Unknown';
          
          const yearLabel = task.aftercare_year 
            ? `Year ${task.aftercare_year} Anniversary`
            : 'Immediate';

          return {
            title: task.title,
            address: pastSale?.address || 'Unknown address',
            vendorName,
            yearLabel,
            dueDate: task.due_date,
          };
        });

        const firstName = agent.full_name?.split(' ')[0] || 'there';

        // Send email
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💝 Aftercare Reminder</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">3 days until your next touchpoint${taskDetails.length > 1 ? 's' : ''}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 16px 16px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>
              
              <p style="margin-bottom: 20px;">You have ${taskDetails.length} aftercare touchpoint${taskDetails.length > 1 ? 's' : ''} coming up in 3 days:</p>
              
              ${taskDetails.map(task => `
                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #8b5cf6;">
                  <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${task.title}</div>
                  <div style="font-size: 14px; color: #6b7280;">
                    📍 ${task.address}<br>
                    👤 ${task.vendorName}<br>
                    🎂 ${task.yearLabel}
                  </div>
                </div>
              `).join('')}
              
              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
                These relationships are valuable! A quick call or message can make all the difference.
              </p>
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.agentbuddy.co/transact" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                  View in AgentBuddy
                </a>
              </div>
            </div>
            
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
              AgentBuddy - Building lasting relationships, one touchpoint at a time
            </p>
          </body>
          </html>
        `;

        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@agentbuddy.co";

        const { error: emailError } = await resend.emails.send({
          from: `AgentBuddy <${fromEmail}>`,
          to: [agent.email],
          subject: `💝 Aftercare Reminder: ${taskDetails.length} touchpoint${taskDetails.length > 1 ? 's' : ''} in 3 days`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Failed to send email to ${agent.email}:`, emailError);
          errors.push(`Failed to email ${agent.email}`);
          continue;
        }

        console.log(`Sent aftercare reminder to ${agent.email} for ${taskDetails.length} tasks`);
        emailsSent++;

        // Mark tasks as reminded
        const taskIds = agentTasks.map(t => t.id);
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ reminder_sent_at: new Date().toISOString() })
          .in("id", taskIds);

        if (updateError) {
          console.error(`Failed to update reminder_sent_at:`, updateError);
        }

      } catch (agentError) {
        console.error(`Error processing agent ${agentId}:`, agentError);
        errors.push(`Error processing agent ${agentId}`);
      }
    }

    console.log(`Aftercare reminders complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${emailsSent} aftercare reminder emails`,
        count: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-aftercare-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
