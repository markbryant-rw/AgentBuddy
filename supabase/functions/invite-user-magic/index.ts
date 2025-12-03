import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * IMPROVED INVITATION FLOW WITH MAGIC LINKS
 *
 * This replaces the password-based invitation system with Supabase's
 * native magic link authentication.
 *
 * Benefits:
 * - No password needed (more secure, better UX)
 * - Single-click acceptance
 * - Leverages Supabase's built-in email delivery
 * - Simpler codebase (less custom auth logic)
 *
 * Flow:
 * 1. Admin invites user → Creates pending_invitation record
 * 2. Send magic link → Supabase inviteUserByEmail with metadata
 * 3. User clicks link → Auto-authenticated
 * 4. Redirect to /onboarding/complete-profile → User fills minimal info
 * 5. Profile created → Role assigned, invitation marked accepted
 */

interface InviteRequest {
  email: string;
  role: 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';
  fullName?: string;
  teamId?: string;
  officeId: string; // Required - every user must belong to an office
}

const INVITATION_HIERARCHY: Record<string, string[]> = {
  platform_admin: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['team_leader', 'salesperson', 'assistant'],
  team_leader: ['salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.agentbuddy.co";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the inviter
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter's roles and profile
    const { data: inviterRoles, error: rolesError } = await supabaseAdmin
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

    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, office_id')
      .eq('id', user.id)
      .single();

    // Parse request body
    const { email, role, fullName, teamId, officeId }: InviteRequest = await req.json();

    if (!email || !role || !officeId) {
      return new Response(
        JSON.stringify({ error: "Email, role, and office are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate office exists
    const { data: officeData, error: officeError } = await supabaseAdmin
      .from('agencies')
      .select('id, name')
      .eq('id', officeId)
      .single();

    if (officeError || !officeData) {
      return new Response(
        JSON.stringify({ error: "Invalid office: office does not exist" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate team if provided
    if (teamId) {
      const { data: teamData, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('id, name, agency_id')
        .eq('id', teamId)
        .single();

      if (teamError || !teamData) {
        return new Response(
          JSON.stringify({ error: 'Invalid team: team does not exist' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure team belongs to the office
      if (teamData.agency_id !== officeId) {
        return new Response(
          JSON.stringify({
            error: `Team "${teamData.name}" does not belong to ${officeData.name}`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // RULE 1: ONE EMAIL = ONE ACCOUNT
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, status, office_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile?.status === 'active') {
      const { data: profileOffice } = await supabaseAdmin
        .from('agencies')
        .select('name')
        .eq('id', existingProfile.office_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          warning: 'user_exists',
          message: `User already exists in ${profileOffice?.name || 'an office'}`,
          profile: {
            id: existingProfile.id,
            email: existingProfile.email,
            full_name: existingProfile.full_name,
            office: profileOffice?.name
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingProfile?.status === 'inactive') {
      return new Response(
        JSON.stringify({
          warning: 'user_inactive',
          message: 'This user was previously deactivated. Contact admin to reactivate.',
          profile: {
            id: existingProfile.id,
            email: existingProfile.email
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, status, expires_at')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({
          warning: 'already_invited',
          message: 'This user has already been invited',
          invitation: {
            id: existingInvitation.id,
            expires_at: existingInvitation.expires_at
          },
          can_resend: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check rate limits
    const { data: rateLimitCheck } = await supabaseAdmin
      .rpc('check_invitation_rate_limit', { _user_id: user.id });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitCheck.message || "Rate limit exceeded. Please try again later.",
          retry_after: rateLimitCheck.retry_after,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    // Create pending invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        full_name: fullName || null,
        invite_code: crypto.randomUUID(), // Still generate a code for tracking
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        team_id: teamId || null,
        office_id: officeId, // Use office_id (standardized naming)
        agency_id: officeId, // Also set agency_id for backwards compatibility during transition
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: `Failed to create invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send magic link invitation via Supabase Auth
    const redirectUrl = `${siteUrl}/onboarding/complete-profile`;

    const { data: authInvite, error: authInviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        data: {
          invitation_id: invitation.id,
          role: role,
          office_id: officeId,
          office_name: officeData.name,
          team_id: teamId || null,
          invited_by_name: inviterProfile?.full_name || inviterProfile?.email || 'AgentBuddy Admin',
          full_name: fullName || null,
        },
        redirectTo: redirectUrl,
      }
    );

    if (authInviteError) {
      console.error('Failed to send magic link:', authInviteError);

      // Log the failure
      await supabaseAdmin.from('invitation_activity_log').insert({
        invitation_id: invitation.id,
        activity_type: 'failed',
        actor_id: user.id,
        recipient_email: email,
        team_id: teamId || null,
        office_id: officeId,
        error_reason: authInviteError.message,
        metadata: { error: authInviteError }
      });

      // Don't fail completely - invitation is created, just email failed
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'email_failed',
          message: 'Invitation created but email failed to send. Please use resend function.',
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful invitation
    await supabaseAdmin.from('invitation_activity_log').insert({
      invitation_id: invitation.id,
      activity_type: 'created',
      actor_id: user.id,
      recipient_email: email,
      team_id: teamId || null,
      office_id: officeId,
      metadata: {
        role: role,
        office_name: officeData.name,
        invited_by: inviterProfile?.full_name
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          office: officeData.name,
          expires_at: invitation.expires_at,
          auth_user_id: authInvite?.user?.id
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in invite-user-magic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
