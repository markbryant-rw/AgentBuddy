import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';
  fullName?: string;
  teamId?: string;
  officeId?: string;
}

const INVITATION_HIERARCHY: Record<string, string[]> = {
  platform_admin: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['team_leader', 'salesperson', 'assistant'],
  team_leader: ['salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter's roles
    const { data: inviterRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (rolesError || !inviterRoles || inviterRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, role, fullName, teamId, officeId }: InviteRequest = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If teamId is provided, validate it exists and belongs to the office
    if (teamId) {
      const { data: teamValidation, error: teamValidationError } = await supabase
        .from('teams')
        .select('id, name, agency_id')
        .eq('id', teamId)
        .single();
        
      if (teamValidationError || !teamValidation) {
        return new Response(
          JSON.stringify({ error: 'Invalid team: team does not exist' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // If officeId is provided, ensure team belongs to that office
      if (officeId && teamValidation.agency_id !== officeId) {
        return new Response(
          JSON.stringify({ 
            error: `Team "${teamValidation.name}" does not belong to the selected office` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // RULE 1: ONE EMAIL = ONE ACCOUNT
    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, status, office_id')
      .eq('email', email)
      .maybeSingle();

    // If user exists and is active
    if (existingProfile && existingProfile.status === 'active') {
      const { data: officeData } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', existingProfile.office_id)
        .single();

      // Check for team memberships to determine if orphaned
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', existingProfile.id);

      const hasOffice = !!existingProfile.office_id;
      const hasTeamMembership = teamMemberships && teamMemberships.length > 0;
      const isOrphaned = !hasOffice || !hasTeamMembership;

      return new Response(
        JSON.stringify({ 
          warning: 'user_exists',
          profile: {
            id: existingProfile.id,
            email: existingProfile.email,
            full_name: existingProfile.full_name,
            office_name: officeData?.name,
            office_id: existingProfile.office_id,
            has_office: hasOffice,
            has_team_membership: hasTeamMembership,
            is_orphaned: isOrphaned
          },
          message: isOrphaned 
            ? `User exists but needs configuration. Contact support.`
            : `User already exists in ${officeData?.name || 'an office'}`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RULE 2: REACTIVATION OVER RECREATION
    // If user exists and is inactive
    if (existingProfile && existingProfile.status === 'inactive') {
      const { data: officeData } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', existingProfile.office_id)
        .single();

      return new Response(
        JSON.stringify({ 
          warning: 'user_inactive',
          profile: {
            id: existingProfile.id,
            email: existingProfile.email,
            full_name: existingProfile.full_name,
            last_office: officeData?.name
          },
          message: 'This user was previously deactivated. Reactivate instead?'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('pending_invitations')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ 
          warning: 'already_invited',
          message: 'This user has already been invited',
          invitation_id: existingInvitation.id,
          can_resend: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limits
    const { data: rateLimitCheck } = await supabase
      .rpc('check_invitation_rate_limit', { _user_id: user.id });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitCheck.message || "Rate limit exceeded",
          retry_after: rateLimitCheck.retry_after,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inviter can invite this role
    const highestInviterRole = inviterRoles[0].role;
    const canInvite = INVITATION_HIERARCHY[highestInviterRole]?.includes(role);

    if (!canInvite) {
      return new Response(
        JSON.stringify({ error: `You don't have permission to invite ${role}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // If NO teamId provided (solo agent), we'll need to create a personal team
    // But we need a user ID first, so we'll handle this in accept-invitation edge function
    // For now, just store the invitation without a team_id
    
    // Create pending invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        full_name: fullName,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        team_id: teamId || null,
        office_id: officeId || null,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invitation email
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.agentbuddy.co';
    const acceptUrl = `${siteUrl}/accept-invitation/${token}`;
    
    // Get inviter details for personalized email
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Your colleague';
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    
    try {
      await resend.emails.send({
        from: `AgentBuddy <${fromEmail}>`,
        to: [email],
        subject: 'You\'ve been invited to join AgentBuddy',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-top: 0;">Hi${fullName ? ' ' + fullName : ''},</p>
                
                <p style="font-size: 16px;"><strong>${inviterName}</strong> has invited you to join <strong>AgentBuddy</strong> as a <strong>${role}</strong>.</p>
                
                <p style="font-size: 16px;">AgentBuddy is your AI-powered real estate hub, designed to make your work easier and more efficient.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${acceptUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                    Accept Invitation & Join
                  </a>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <p style="margin: 0; font-size: 14px; color: #856404;">
                    ⏰ <strong>This invitation expires in 48 hours</strong><br>
                    📅 Expires on: ${new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    // Log invitation to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'invitation_sent',
      details: {
        invited_email: email,
        role,
        team_id: teamId,
        office_id: officeId,
      },
    });

    // Log invitation activity
    await supabase.from('invitation_activity_log').insert({
      invitation_id: invitation.id,
      activity_type: 'created',
      actor_id: user.id,
      recipient_email: email.toLowerCase(),
      team_id: teamId || null,
      office_id: officeId || null,
      metadata: { role, full_name: fullName },
    });

    await supabase.from('invitation_activity_log').insert({
      invitation_id: invitation.id,
      activity_type: 'sent',
      actor_id: user.id,
      recipient_email: email.toLowerCase(),
      team_id: teamId || null,
      office_id: officeId || null,
      metadata: { email_sent: true },
    });

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in invite-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
