import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isDemoEmail } from "../_shared/demoCheck.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing environment variables");
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token for user verification
    const token = authHeader.replace('Bearer ', '');

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Create client with auth header for user verification
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { invitationId } = await req.json();

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Invitation ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, email, full_name, status, invited_by, team_id, agency_id')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Invitation is ${invitation.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this invitation or is platform_admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = userRoles?.some((r: any) => r.role === 'platform_admin');
    const ownsInvitation = invitation.invited_by === user.id;

    if (!isPlatformAdmin && !ownsInvitation) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to resend this invitation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new token and update expiry (7 days, consistent with initial invite)
    const newToken = crypto.randomUUID() + '-' + Date.now().toString(36);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const { error: updateError } = await supabaseAdmin
      .from('pending_invitations')
      .update({
        invite_code: newToken,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) {
      throw updateError;
    }

    // Get inviter details
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Your colleague';

    // Generate invitation link
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.agentbuddy.co';
    const invitationLink = `${siteUrl}/accept-invitation/${newToken}`;

    // Use verified domain from env or fallback to test domain
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    // Skip email for demo users
    if (isDemoEmail(user.email)) {
      console.log('Demo user - skipping real email resend');
      return new Response(
        JSON.stringify({ 
          success: true, 
          demo: true,
          message: "Invitation resent (email simulated in demo mode)" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resend email
    await resend.emails.send({
      from: `AgentBuddy <${fromEmail}>`,
      to: [invitation.email],
      subject: `Reminder: You've been invited to join AgentBuddy`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📬 Invitation Reminder</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-top: 0;">Hi${invitation.full_name ? ' ' + invitation.full_name : ''},</p>
              
              <p style="font-size: 16px;">This is a reminder that <strong>${inviterName}</strong> has invited you to join <strong>AgentBuddy</strong>.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Accept Invitation & Join
                </a>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  ⏰ <strong>This invitation expires in 7 days</strong><br>
                  📅 Expires on: ${newExpiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 25px;">
                If you have any questions, feel free to reach out to ${inviterName} at ${inviterProfile?.email || ''}.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'invitation_resent',
      target_user_id: null,
      details: {
        email: invitation.email,
        invitation_id: invitationId,
      },
    });

    // Log activity (skip if table doesn't exist yet)
    try {
      await supabaseAdmin.from('invitation_activity_log').insert({
        invitation_id: invitationId,
        activity_type: 'reminder_sent',
        actor_id: user.id,
        recipient_email: invitation.email,
        team_id: invitation.team_id,
        agency_id: invitation.agency_id,
        metadata: { new_expiry: newExpiresAt.toISOString() },
      });
    } catch (logError) {
      console.log('Activity log skipped:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation resent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in resend-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
