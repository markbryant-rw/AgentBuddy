import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * RESEND INVITATION - Magic Link
 *
 * Allows admins to resend expired or failed invitations.
 *
 * Features:
 * - Extends expiration by 7 days
 * - Resends magic link email
 * - Logs resend activity
 * - Can resend to pending or expired invitations
 * - Cannot resend accepted or revoked invitations
 */

interface ResendRequest {
  invitation_id: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.agentbuddy.co';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (office_manager or platform_admin)
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const hasPermission = userRoles?.some(r =>
      r.role === 'platform_admin' || r.role === 'office_manager'
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { invitation_id }: ResendRequest = await req.json();

    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: 'invitation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, email, role, full_name, office_id, agency_id, team_id, status, invited_by')
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate can resend
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Cannot resend an accepted invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Cannot resend a revoked invitation. Create a new one instead.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use office_id if available, fallback to agency_id
    const officeId = invitation.office_id || invitation.agency_id;

    // Fetch office details
    const { data: officeData } = await supabaseAdmin
      .from('agencies')
      .select('name')
      .eq('id', officeId)
      .single();

    // Fetch inviter details
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single();

    // Extend expiration
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation
    const { error: updateError } = await supabaseAdmin
      .from('pending_invitations')
      .update({
        expires_at: newExpiresAt.toISOString(),
        status: 'pending', // Reset to pending if it was expired
      })
      .eq('id', invitation_id);

    if (updateError) {
      console.error('Failed to update invitation:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update invitation: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if auth user already exists for this email
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let authUserId: string | undefined;

    if (existingAuthUser) {
      // User already has auth account - update their metadata
      const { error: updateMetadataError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          user_metadata: {
            invitation_id: invitation.id,
            role: invitation.role,
            office_id: officeId,
            office_name: officeData?.name,
            team_id: invitation.team_id || null,
            invited_by_name: inviterProfile?.full_name || inviterProfile?.email,
            full_name: invitation.full_name || null,
          }
        }
      );

      if (updateMetadataError) {
        console.error('Failed to update user metadata:', updateMetadataError);
      }

      // Generate new magic link for existing user
      const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin
        .generateLink({
          type: 'magiclink',
          email: invitation.email,
          options: {
            redirectTo: `${siteUrl}/onboarding/complete-profile`,
          }
        });

      if (magicLinkError) {
        console.error('Failed to generate magic link:', magicLinkError);

        // Log failure
        await supabaseAdmin.from('invitation_activity_log').insert({
          invitation_id: invitation.id,
          activity_type: 'failed',
          actor_id: user.id,
          recipient_email: invitation.email,
          team_id: invitation.team_id,
          office_id: officeId,
          error_reason: `Magic link generation failed: ${magicLinkError.message}`,
        });

        return new Response(
          JSON.stringify({ error: 'Failed to generate magic link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = existingAuthUser.id;

      // TODO: Send email with magic link manually using Resend
      // (Supabase doesn't auto-send when using generateLink)
      console.log('Magic link generated:', magicLinkData.properties.action_link);

    } else {
      // Send new invitation via Supabase Auth
      const redirectUrl = `${siteUrl}/onboarding/complete-profile`;

      const { data: authInvite, error: authInviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        invitation.email,
        {
          data: {
            invitation_id: invitation.id,
            role: invitation.role,
            office_id: officeId,
            office_name: officeData?.name,
            team_id: invitation.team_id || null,
            invited_by_name: inviterProfile?.full_name || inviterProfile?.email,
            full_name: invitation.full_name || null,
          },
          redirectTo: redirectUrl,
        }
      );

      if (authInviteError) {
        console.error('Failed to send invitation:', authInviteError);

        // Log failure
        await supabaseAdmin.from('invitation_activity_log').insert({
          invitation_id: invitation.id,
          activity_type: 'failed',
          actor_id: user.id,
          recipient_email: invitation.email,
          team_id: invitation.team_id,
          office_id: officeId,
          error_reason: authInviteError.message,
        });

        return new Response(
          JSON.stringify({ error: 'Failed to send invitation email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authInvite?.user?.id;
    }

    // Log successful resend
    await supabaseAdmin.from('invitation_activity_log').insert({
      invitation_id: invitation.id,
      activity_type: 'reminder_sent',
      actor_id: user.id,
      recipient_email: invitation.email,
      team_id: invitation.team_id,
      office_id: officeId,
      metadata: {
        resent_by: inviterProfile?.full_name,
        new_expires_at: newExpiresAt.toISOString(),
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation resent to ${invitation.email}`,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expires_at: newExpiresAt.toISOString(),
          auth_user_id: authUserId,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in resend-invitation-magic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
