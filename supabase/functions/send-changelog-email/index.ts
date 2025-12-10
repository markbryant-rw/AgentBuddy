import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "updates@agentbuddy.co";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date for the changelog
    const today = new Date();
    const entryDate = today.toISOString().split('T')[0];

    // Also check yesterday's entry in case we're running early morning
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    console.log(`Looking for changelog entries for ${entryDate} or ${yesterdayDate}`);

    // Fetch the most recent unsent changelog entry
    const { data: changelog, error: fetchError } = await supabase
      .from('changelog_entries')
      .select('*')
      .is('email_sent_at', null)
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching changelog:', fetchError);
      throw fetchError;
    }

    if (!changelog) {
      console.log('No unsent changelog entries found');
      return new Response(
        JSON.stringify({ message: "No changelog to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!changelog.ai_summary) {
      console.log('Changelog has no summary, skipping');
      return new Response(
        JSON.stringify({ message: "Changelog has no summary" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending changelog for ${changelog.entry_date}`);

    // Fetch all active users who want product updates
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name
      `)
      .neq('email', 'demo@agentbuddy.co');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Filter users who have opted in to product updates
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, receive_product_updates')
      .eq('receive_product_updates', true);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
    }

    const optedInUserIds = new Set(preferences?.map(p => p.user_id) || []);
    
    // Include users who haven't set preferences yet (default is true)
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('user_id');
    
    const usersWithPrefs = new Set(allPrefs?.map(p => p.user_id) || []);

    const eligibleUsers = users?.filter(user => {
      // User either opted in explicitly, or hasn't set preferences (default true)
      return optedInUserIds.has(user.id) || !usersWithPrefs.has(user.id);
    }) || [];

    console.log(`Sending to ${eligibleUsers.length} users`);

    if (eligibleUsers.length === 0) {
      console.log('No eligible users to send to');
      return new Response(
        JSON.stringify({ message: "No eligible users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the date nicely
    const formattedDate = new Date(changelog.entry_date).toLocaleDateString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate HTML email
    const htmlEmail = generateEmailHtml(
      changelog.ai_summary,
      formattedDate,
      changelog.bug_count,
      changelog.feature_count
    );

    // Send emails in batches
    let sentCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      const batch = eligibleUsers.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (user) => {
        try {
          await resend.emails.send({
            from: `AgentBuddy Updates <${resendFromEmail}>`,
            to: [user.email],
            subject: `🏠 What's New at AgentBuddy - ${formattedDate}`,
            html: htmlEmail.replace('{{userName}}', user.full_name || 'there'),
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err);
          errorCount++;
        }
      });

      await Promise.all(emailPromises);
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < eligibleUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Mark changelog as sent
    const { error: updateError } = await supabase
      .from('changelog_entries')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', changelog.id);

    if (updateError) {
      console.error('Error marking changelog as sent:', updateError);
    }

    console.log(`Changelog emails sent: ${sentCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        date: changelog.entry_date,
        sentCount,
        errorCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending changelog:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateEmailHtml(summary: string, date: string, bugCount: number, featureCount: number): string {
  // Convert markdown-style formatting to HTML
  const formattedSummary = summary
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentBuddy Updates</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 AgentBuddy</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">What's New</p>
            </td>
          </tr>

          <!-- Date Badge -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">${date}</p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding: 16px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  ${bugCount > 0 ? `
                  <td style="text-align: center; padding: 12px; background-color: #fef3c7; border-radius: 8px; margin-right: 8px;">
                    <span style="font-size: 24px;">🔧</span>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #92400e; font-weight: 600;">${bugCount} Bug${bugCount > 1 ? 's' : ''} Fixed</p>
                  </td>
                  ` : ''}
                  ${featureCount > 0 ? `
                  <td style="text-align: center; padding: 12px; background-color: #d1fae5; border-radius: 8px;">
                    <span style="font-size: 24px;">✨</span>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #065f46; font-weight: 600;">${featureCount} New Feature${featureCount > 1 ? 's' : ''}</p>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="font-size: 16px; line-height: 1.6; color: #3f3f46;">
                ${formattedSummary}
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 16px 40px 32px; text-align: center;">
              <a href="https://www.agentbuddy.co" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Open AgentBuddy</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f4f4f5; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                You're receiving this because you're an AgentBuddy user.<br>
                <a href="https://www.agentbuddy.co/settings" style="color: #14b8a6; text-decoration: none;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
