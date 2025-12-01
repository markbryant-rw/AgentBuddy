import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ReactivateUserRequest {
  userId: string;
  email: string;
  role: string;
  teamId?: string;
  officeId?: string;
  fullName?: string;
  mobileNumber?: string;
  birthday?: string;
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase clients
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (platform_admin or office_manager)
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id)
      .is('revoked_at', null);

    if (rolesError || !userRoles) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasPermission = userRoles.some(r => 
      r.role === 'platform_admin' || r.role === 'office_manager'
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, email, role, teamId, officeId, fullName, mobileNumber, birthday, password }: ReactivateUserRequest = await req.json();

    // Validate required fields
    if (!userId || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the inactive profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, office:agencies(*)')
      .eq('id', userId)
      .eq('status', 'inactive')
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Inactive user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start transaction-like operations
    
    // 1. Reactivate auth user (change email back, remove ban, and update password if provided)
    const authUpdatePayload: any = {
      email: email,
      ban_duration: 'none'
    };
    
    if (password) {
      authUpdatePayload.password = password;
    }
    
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      authUpdatePayload
    );

    if (authUpdateError) {
      console.error('Failed to reactivate auth user:', authUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reactivate auth user', details: authUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Update profile status and details
    const profileUpdatePayload: any = {
      status: 'active',
      office_id: officeId || profile.office_id,
      primary_team_id: teamId || null,
      password_set: password ? true : profile.password_set,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    };
    
    if (fullName) profileUpdatePayload.full_name = fullName;
    if (mobileNumber) profileUpdatePayload.mobile_number = mobileNumber;
    if (birthday) profileUpdatePayload.birthday = birthday;
    
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Failed to update profile:', profileUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: profileUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create team membership if teamId provided
    if (teamId) {
      const { error: teamMemberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId,
          access_level: role === 'team_leader' ? 'admin' : 'member'
        });

      if (teamMemberError) {
        console.error('Failed to add team membership:', teamMemberError);
        // Don't fail the entire operation, just log
      }
    }

    // 4. Assign or update role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role,
        assigned_by: authUser.id,
        assigned_at: new Date().toISOString()
      });

    if (roleError) {
      console.error('Failed to assign role:', roleError);
      // Don't fail the entire operation
    }

    // 5. Mark pending invitation as accepted
    const { error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('status', 'pending');

    if (invitationError) {
      console.error('Failed to update invitation:', invitationError);
      // Don't fail the entire operation
    }

    // 6. Log reactivation in audit logs
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'user_reactivated',
        target_user_id: userId,
        details: {
          email: email,
          role: role,
          team_id: teamId,
          office_id: officeId,
          previous_office: profile.office?.name,
          reactivated_by: authUser.email
        }
      });

    if (auditError) {
      console.error('Failed to log audit:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User reactivated successfully',
        userId: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reactivate-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
