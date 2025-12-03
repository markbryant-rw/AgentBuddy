import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



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

    const { token, fullName, mobileNumber, birthday, password } = await req.json();

    if (!token || !fullName || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'missing_fields',
          message: 'Token, full name, and password are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Validate invitation
    console.log('Fetching invitation');
    const { data: invitationRaw, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, email, role, full_name, team_id, office_id, agency_id, invited_by, expires_at, status')
      .eq('invite_code', token)
      .single();

    // Use office_id if available, fallback to agency_id for backwards compatibility
    const invitation = invitationRaw ? {
      ...invitationRaw,
      office_id: invitationRaw.office_id || invitationRaw.agency_id
    } : null;

    if (invitationError || !invitation) {
      console.error('Invitation error:', invitationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'invalid_token',
          message: 'This invitation is invalid or does not exist' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: invitation.status === 'accepted' ? 'already_used' : 'invalid_status',
          message: invitation.status === 'accepted' 
            ? 'This invitation has already been used'
            : `This invitation is ${invitation.status}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'expired',
          message: 'This invitation has expired' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check for existing auth user
    console.log('Checking for existing auth user');
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingAuthUser) {
      console.log('Auth user already exists:', existingAuthUser.id);
      
      // Check if this existing user has a COMPLETE profile (office_id and primary_team_id)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, office_id, primary_team_id, status')
        .eq('id', existingAuthUser.id)
        .single();
      
      if (existingProfile && existingProfile.status === 'active' && existingProfile.office_id && existingProfile.primary_team_id) {
        // Fully configured user - they should sign in instead
        console.log('User is fully configured, should sign in instead');
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: 'user_exists',
            message: 'This email already has an active account. Please sign in instead.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Auth user exists but profile is incomplete - resume setup
      console.log('Auth user exists but profile incomplete - resuming setup');
      userId = existingAuthUser.id;
      
      // Update the auth user's password since they're re-accepting
      const { error: updatePwError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      
      if (updatePwError) {
        console.error('Failed to update auth user password:', updatePwError);
        // Continue anyway - user might need to reset password later
      } else {
        console.log('✅ Updated auth user password');
      }
    } else {
      // Step 3: Check for existing profiles (both active and inactive)
      console.log('Checking for existing profiles');
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, status, office_id, primary_team_id')
        .eq('email', invitation.email);

      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`⚠️ Found ${existingProfiles.length} existing profile(s):`, 
          existingProfiles.map(p => ({ id: p.id, status: p.status, has_office: !!p.office_id }))
        );
        
        // CRITICAL: Check if any ACTIVE profiles exist
        const activeProfiles = existingProfiles.filter(p => p.status === 'active');
        if (activeProfiles.length > 0) {
          console.error(`❌ Cannot accept invitation - active profile(s) already exist:`, activeProfiles);
          return new Response(
            JSON.stringify({ 
              success: false, 
              code: 'user_exists',
              message: 'An active account with this email already exists. Please sign in instead, or contact your office manager if you need assistance.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          );
        }
        
        // Archive inactive/orphaned profiles by changing their email
        console.log(`📦 Archiving ${existingProfiles.length} inactive profile(s)...`);
        const timestamp = Date.now();
        for (const profile of existingProfiles) {
          const { error: archiveError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              email: `${profile.id}.archived-${timestamp}@deleted.local`,
              status: 'inactive'
            })
            .eq('id', profile.id);
            
          if (archiveError) {
            console.error(`❌ Failed to archive profile ${profile.id}:`, archiveError);
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Failed to prepare account for activation. Please contact support.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
          } else {
            console.log(`✅ Archived profile ${profile.id}`);
          }
        }
      } else {
        console.log('✅ No existing profiles found - proceeding with user creation');
      }

      // Step 4: Create the auth user
      console.log('Creating auth user');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authData.user) {
        console.error('Auth creation error:', authError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: 'auth_creation_failed',
            message: `Failed to create user account: ${authError?.message || 'Unknown error'}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      console.log('Auth user created:', userId);
    }

    // Step 5: Upsert profile WITHOUT primary_team_id (will be set after team membership is created)
    console.log('Upserting profile for user:', userId);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: invitation.email,
        full_name: fullName,
        mobile: mobileNumber || null,
        birthday: birthday || null,
        office_id: invitation.office_id,
        // NOTE: primary_team_id will be set AFTER team membership is created
        password_set: true,
        onboarding_completed: true,
        status: 'active',
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'profile_creation_failed',
          message: `Failed to create user profile: ${profileError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Handle team assignment - CRITICAL STEP
    let assignedTeamId = invitation.team_id;
    
    // If NO team_id but office_id exists, create a personal team for solo agent
    if (!assignedTeamId && invitation.office_id) {
      console.log('No team assigned - creating personal team for solo agent');
      
      const { data: personalTeamId, error: personalTeamError } = await supabaseAdmin
        .rpc('ensure_personal_team', {
          user_id_param: userId,
          user_full_name: fullName,
          office_id_param: invitation.office_id
        });
        
      if (personalTeamError) {
        console.error('Failed to create personal team:', personalTeamError);
        // Don't fail the invitation - user can be added to a team later
      } else {
        console.log('✅ Personal team created:', personalTeamId);
        assignedTeamId = personalTeamId;
      }
    }
    
    // If we have a team (either provided or personal), create membership
    if (assignedTeamId) {
      console.log('Creating team membership for team:', assignedTeamId);
      
      // Validate team exists and belongs to correct office
      const { data: teamValidation, error: teamValidationError } = await supabaseAdmin
        .from('teams')
        .select('id, agency_id, name')
        .eq('id', assignedTeamId)
        .eq('agency_id', invitation.office_id)
        .single();
        
      if (teamValidationError || !teamValidation) {
        console.error('Team validation failed:', teamValidationError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: 'invalid_team',
            message: 'The team you were invited to no longer exists. Please contact your office manager.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const accessLevel = invitation.role === 'team_leader' ? 'admin' : 'edit';
      
      const { error: teamMemberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: assignedTeamId,
          access_level: accessLevel,
        });

      if (teamMemberError) {
        console.error('CRITICAL: Team member creation failed:', teamMemberError);
        
        // Log to audit trail
        await supabaseAdmin.from('audit_logs').insert({
          user_id: userId,
          action: 'team_assignment_failed',
          details: {
            team_id: assignedTeamId,
            team_name: teamValidation.name,
            error: teamMemberError.message,
            invitation_id: invitation.id
          }
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: 'team_assignment_failed',
            message: `Failed to add you to "${teamValidation.name}". Please contact your office manager to manually add you to the team.`,
            details: {
              team_name: teamValidation.name,
              user_id: userId
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Verify team membership was actually created
      const { data: verifyMembership, error: verifyError } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', assignedTeamId)
        .single();
        
      if (verifyError || !verifyMembership) {
        console.error('CRITICAL: Team membership verification failed');
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: 'team_verification_failed',
            message: 'Failed to verify team membership. Please contact your office manager.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log successful team assignment
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action: 'user_joined_team',
        details: {
          team_id: assignedTeamId,
          team_name: teamValidation.name,
          invitation_id: invitation.id,
          invited_by: invitation.invited_by
        }
      });
      
      console.log('✅ Team membership created and verified:', verifyMembership.id);
      
      // Now that team membership exists, update profile with primary_team_id
      console.log('Updating profile with primary_team_id:', assignedTeamId);
      const { error: updatePrimaryTeamError } = await supabaseAdmin
        .from('profiles')
        .update({ primary_team_id: assignedTeamId })
        .eq('id', userId);
        
      if (updatePrimaryTeamError) {
        console.error('Failed to update primary_team_id:', updatePrimaryTeamError);
        // Don't fail the whole invitation, user can still function without primary_team_id
      } else {
        console.log('✅ Profile updated with primary_team_id');
      }
    }

    // CRITICAL VERIFICATION: Check profile was fully configured
    console.log('Running final profile verification...');
    const { data: finalVerification, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('office_id, primary_team_id')
      .eq('id', userId)
      .single();

    if (verifyError || !finalVerification?.office_id) {
      console.error('❌ CRITICAL: Profile verification failed after team assignment');
      
      // Log critical error for monitoring
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action: 'profile_verification_failed',
        details: {
          office_id_missing: !finalVerification?.office_id,
          primary_team_id_missing: !finalVerification?.primary_team_id,
          invitation_id: invitation.id,
          team_id: assignedTeamId
        }
      });
      
      return new Response(
        JSON.stringify({ 
          success: false,
          code: 'profile_incomplete',
          message: 'Account created but configuration incomplete. Please contact your office manager.',
          user_id: userId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Profile verification passed:', finalVerification);

    // Step 7: Assign role (CRITICAL - user needs role to function)
    console.log('Assigning role:', invitation.role);
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: invitation.role,
        assigned_by: invitation.invited_by,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'role_assignment_failed',
          message: `Failed to assign role: ${roleError.message}. Please contact your office manager to assign your role.` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 8: Mark invitation as accepted
    console.log('Marking invitation as accepted');
    await supabaseAdmin
      .from('pending_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Step 9: Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'invitation_accepted',
        user_id: userId,
        target_user_id: userId,
        details: {
          invitation_id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          team_id: invitation.team_id,
          office_id: invitation.office_id,
        },
      });

    // Log activity
    await supabaseAdmin
      .from('invitation_activity_log')
      .insert({
        invitation_id: invitation.id,
        activity_type: 'accepted',
        actor_id: userId,
        recipient_email: invitation.email,
        team_id: invitation.team_id,
        office_id: invitation.office_id,
        metadata: { user_id: userId },
      });

    // Step 10: Send notifications now that account is fully created
    if (assignedTeamId && invitation.office_id) {
      console.log('Sending new member notifications...');
      const { error: notificationError } = await supabaseAdmin
        .rpc('notify_on_account_created', {
          p_user_id: userId,
          p_team_id: assignedTeamId,
          p_office_id: invitation.office_id
        });
        
      if (notificationError) {
        console.error('Failed to send notifications (non-critical):', notificationError);
        // Don't fail the whole invitation if notifications fail
      } else {
        console.log('✅ Notifications sent successfully');
      }
    }

    console.log('Invitation acceptance complete for user:', userId);
    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in accept-invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        code: 'internal_error',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
