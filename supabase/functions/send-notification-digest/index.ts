import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPreference {
  user_id: string;
  email_digest_enabled: boolean;
  email_digest_frequency: string;
  email_digest_hour: number;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  action_url: string | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { frequency = 'daily' } = await req.json().catch(() => ({}));
    const currentHour = new Date().getUTCHours();

    console.log(`Processing ${frequency} digest at hour ${currentHour}`);

    // Get users who have digest enabled for this frequency and hour
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, email_digest_enabled, email_digest_frequency, email_digest_hour')
      .eq('email_digest_enabled', true)
      .eq('email_digest_frequency', frequency);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users with digest enabled for this frequency');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users to notify' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by hour preference (approximate match within 1 hour)
    const eligibleUsers = preferences.filter((p: NotificationPreference) => {
      const hourDiff = Math.abs(p.email_digest_hour - currentHour);
      return hourDiff <= 1 || hourDiff >= 23; // Allow 1 hour tolerance
    });

    if (eligibleUsers.length === 0) {
      console.log('No users scheduled for this hour');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users scheduled for this hour' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = eligibleUsers.map((p: NotificationPreference) => p.user_id);

    // Get user profiles for email addresses
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of (profiles || []) as Profile[]) {
      try {
        // Get unread notifications for this user that haven't been included in a digest
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('id, title, message, type, action_url, created_at')
          .eq('user_id', profile.id)
          .eq('is_read', false)
          .is('digest_sent_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (notifError) {
          console.error(`Error fetching notifications for ${profile.id}:`, notifError);
          continue;
        }

        if (!notifications || notifications.length === 0) {
          console.log(`No unread notifications for ${profile.email}`);
          continue;
        }

        // Generate email HTML
        const emailHtml = generateDigestEmail(
          profile.full_name || 'there',
          notifications as Notification[],
          frequency
        );

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AgentBuddy <noreply@agentbuddy.co>',
            to: profile.email,
            subject: `Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Summary`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${profile.email}:`, errorText);
          errors.push(`${profile.email}: ${errorText}`);
          continue;
        }

        // Mark notifications as included in digest
        const notificationIds = notifications.map((n: Notification) => n.id);
        await supabase
          .from('notifications')
          .update({ digest_sent_at: new Date().toISOString() })
          .in('id', notificationIds);

        sentCount++;
        console.log(`Sent digest to ${profile.email} with ${notifications.length} notifications`);
      } catch (err) {
        console.error(`Error processing user ${profile.id}:`, err);
        errors.push(`${profile.email}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-notification-digest:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateDigestEmail(userName: string, notifications: Notification[], frequency: string): string {
  const notificationRows = notifications.map(n => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${escapeHtml(n.title)}</div>
        <div style="color: #6b7280; font-size: 14px;">${escapeHtml(n.message)}</div>
        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
          ${formatDate(n.created_at)}
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #14b8a6, #0ea5e9); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
            📬 Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Summary
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
            AgentBuddy Notification Digest
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <p style="color: #374151; margin: 0 0 20px 0;">
            Hey ${escapeHtml(userName)}! Here's what you missed:
          </p>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${notificationRows}
          </table>
          
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://www.agentbuddy.co/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0ea5e9); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              View All Notifications
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            You're receiving this because you have ${frequency} digests enabled.
            <a href="https://www.agentbuddy.co/settings" style="color: #14b8a6; text-decoration: none;">
              Manage preferences
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
