import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * COMPLETE PROFILE - Magic Link Flow
 *
 * This function is called after a user accepts their magic link invitation
 * and fills out the profile completion form.
 *
 * Steps:
 * 1. Validate invitation exists and is pending
 * 2. Create/update profile with user details
 * 3. Assign role from invitation
 * 4. Assign to team if specified (or skip for post-onboarding assignment)
 * 5. Mark invitation as accepted
 * 6. Log all activities
 *
 * Returns: Success with profile data
 */

interface CompleteProfileRequest {
  invitation_id: string;
  full_name: string;
  mobile_number: string;
  birthday: string; // Format: YYYY-MM-DD
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

    // Parse request body
    const { invitation_id, full_name, mobile_number, birthday }: CompleteProfileRequest = await req.json();

    if (!invitation_id || !full_name || !mobile_number || !birthday) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, email, role, office_id, agency_id, team_id, status, invited_by, expires_at')
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate invitation status
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'This invitation has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'This invitation has been revoked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: 'Email mismatch. This invitation was sent to a different email address.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use office_id if available, fallback to agency_id
    const officeId = invitation.office_id || invitation.agency_id;

    if (!officeId) {
      return new Response(
        JSON.stringify({ error: 'Invalid invitation: missing office assignment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create/Update Profile
    console.log('Creating profile for user:', user.id);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: invitation.email,
        full_name: full_name,
        mobile: mobile_number,
        birthday: birthday,
        office_id: officeId,
        status: 'active',
        password_set: false, // No password in magic link flow
        onboarding_completed: true,
        active_role: invitation.role, // Set their assigned role as active
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return new Response(
        JSON.stringify({
          error: `Failed to create profile: ${profileError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Assign Role
    console.log('Assigning role:', invitation.role);
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: invitation.role,
        granted_by: invitation.invited_by,
        granted_at: new Date().toISOString(),
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      // Don't fail completely - profile is created
      // Log the error and continue
    }

    // Step 4: Handle Team Assignment (if team_id provided)
    let teamAssigned = false;
    if (invitation.team_id) {
      console.log('Assigning to team:', invitation.team_id);

      // Determine access level based on role
      const accessLevel = invitation.role === 'team_leader' ? 'admin' : 'edit';

      const { error: teamMemberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          access_level: accessLevel,
          joined_at: new Date().toISOString(),
        });

      if (teamMemberError) {
        console.error('Team assignment error:', teamMemberError);
        // Don't fail - team can be assigned later
      } else {
        teamAssigned = true;

        // Update profile with primary_team_id
        await supabaseAdmin
          .from('profiles')
          .update({ primary_team_id: invitation.team_id })
          .eq('id', user.id);
      }
    }

    // Step 5: Mark invitation as accepted
    console.log('Marking invitation as accepted');
    const { error: acceptError } = await supabaseAdmin
      .from('pending_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation_id);

    if (acceptError) {
      console.error('Failed to mark invitation as accepted:', acceptError);
      // Don't fail - user is created
    }

    // Step 6: Log activity
    await supabaseAdmin.from('invitation_activity_log').insert({
      invitation_id: invitation_id,
      activity_type: 'accepted',
      actor_id: user.id,
      recipient_email: invitation.email,
      team_id: invitation.team_id,
      office_id: officeId,
      metadata: {
        role: invitation.role,
        team_assigned: teamAssigned,
        completed_at: new Date().toISOString(),
      }
    });

    // Step 7: Send notification to inviter (optional)
    try {
      await supabaseAdmin.rpc('notify_on_account_created', {
        new_user_id: user.id,
        inviter_id: invitation.invited_by,
      });
    } catch (notifyError) {
      console.error('Notification error (non-critical):', notifyError);
      // Don't fail on notification errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile completed successfully',
        profile: {
          id: user.id,
          email: invitation.email,
          full_name: full_name,
          role: invitation.role,
          office_id: officeId,
          team_assigned: teamAssigned,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-profile-magic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
