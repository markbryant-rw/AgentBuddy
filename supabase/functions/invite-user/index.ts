import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isDemoEmail } from "../_shared/demoCheck.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
};

interface InviteRequest {
  email: string;
  role: 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';
  fullName?: string;
  teamId?: string;
  officeId?: string; // Maps to agency_id in database
}

const INVITATION_HIERARCHY: Record<string, string[]> = {
  platform_admin: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['team_leader', 'salesperson', 'assistant'],
  team_leader: ['salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};

const handler = async (req: Request): Promise<Response> => {
  console.log('invite-user: Request received', { method: req.method });
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('invite-user: Missing environment variables');
      throw new Error("Missing environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    console.log('invite-user: Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('invite-user: No Authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized - no auth header" }),
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

    // Get inviter's profile for context validation
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('office_id, primary_team_id')
      .eq('id', user.id)
      .single();

    // Parse request body
    const { email, role, fullName, teamId, officeId }: InviteRequest = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =================================================================
    // SERVER-SIDE CONTEXT VALIDATION (SECURITY CRITICAL)
    // =================================================================
    // Determine the highest role (for permission checks)
    const highestRole = inviterRoles[0].role;
    const isPlatformAdmin = highestRole === 'platform_admin';
    const isOfficeManager = highestRole === 'office_manager';
    const isTeamLeader = highestRole === 'team_leader';

    let validatedOfficeId = officeId;
    let validatedTeamId = teamId;

    if (isPlatformAdmin) {
      // Platform admins have full control
      // They can invite to any office and any team
      if (!officeId) {
        return new Response(
          JSON.stringify({ error: 'Platform admins must specify an office' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Trust their selections
      validatedOfficeId = officeId;
      validatedTeamId = teamId; // Can be null (personal team will be created)

    } else if (isOfficeManager) {
      // Office managers can only invite to THEIR office
      if (!inviterProfile?.office_id) {
        return new Response(
          JSON.stringify({ error: 'Office manager profile is incomplete (missing office)' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Force their office (ignore any client-provided value)
      validatedOfficeId = inviterProfile.office_id;

      // If client provided a different office, that's a security violation
      if (officeId && officeId !== validatedOfficeId) {
        console.warn(`Office manager ${user.id} attempted to invite to different office ${officeId}`);
        return new Response(
          JSON.stringify({ error: 'You can only invite users to your own office' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Team is optional (undefined = personal team)
      validatedTeamId = teamId || undefined;

    } else if (isTeamLeader) {
      // Team leaders can ONLY add to their own team
      if (!inviterProfile?.office_id || !inviterProfile?.primary_team_id) {
        return new Response(
          JSON.stringify({ error: 'Team leader profile is incomplete (missing office or team)' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Force their office and team (ignore any client-provided values)
      validatedOfficeId = inviterProfile.office_id;
      validatedTeamId = inviterProfile.primary_team_id;

      // Log any attempts to invite to different teams
      if (teamId && teamId !== validatedTeamId) {
        console.warn(`Team leader ${user.id} attempted to invite to different team ${teamId}`);
      }
      if (officeId && officeId !== validatedOfficeId) {
        console.warn(`Team leader ${user.id} attempted to invite to different office ${officeId}`);
      }

      // Team leaders cannot create personal teams - they build their own team
      // Always use their team
    } else {
      // Other roles (salesperson, assistant) should not be able to invite
      // (already filtered by INVITATION_HIERARCHY, but double-check)
      return new Response(
        JSON.stringify({ error: "Your role doesn't have invitation permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use validated values from here on
    const finalOfficeId = validatedOfficeId;
    const finalTeamId = validatedTeamId;

    // If finalTeamId is provided, validate it exists and belongs to the office
    if (finalTeamId) {
      const { data: teamValidation, error: teamValidationError } = await supabase
        .from('teams')
        .select('id, name, agency_id')
        .eq('id', finalTeamId)
        .single();

      if (teamValidationError || !teamValidation) {
        return new Response(
          JSON.stringify({ error: 'Invalid team: team does not exist' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure team belongs to the validated office
      if (teamValidation.agency_id !== finalOfficeId) {
        return new Response(
          JSON.stringify({
            error: `Team "${teamValidation.name}" does not belong to the specified office`
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

    // Check rate limits (RPC returns array of rows)
    const { data: rateLimitCheck } = await supabase
      .rpc('check_invitation_rate_limit', { _user_id: user.id });

    const rateLimitResult = rateLimitCheck?.[0];
    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitResult.message || "Rate limit exceeded",
          retry_after: rateLimitResult.retry_after,
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

    // Create pending invitation - use validated context values
    const { data: invitation, error: inviteError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        full_name: fullName,
        invite_code: token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        team_id: finalTeamId || null, // Validated team (null = personal team will be created)
        office_id: finalOfficeId || null, // Validated office (new standard)
        agency_id: finalOfficeId || null, // Also set agency_id for backwards compatibility
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
    const { data: inviterDetails } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    const inviterName = inviterDetails?.full_name || inviterDetails?.email || 'Your colleague';
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    
    // Skip email for demo users - just create the invitation record
    if (isDemoEmail(user.email)) {
      console.log('Demo user - skipping real email send');
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation,
          demo: true,
          message: 'Invitation created (email simulated in demo mode)'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
                    ⏰ <strong>This invitation expires in 7 days</strong><br>
                    📅 Expires on: ${new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 25px;">
                  If you have any questions, feel free to reach out to ${inviterName} at ${inviterDetails?.email || ''}.
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
