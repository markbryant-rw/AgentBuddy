import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, createRateLimitResponse, getIpAddress, logSuspiciousActivity } from '../_shared/rateLimit.ts';
import { validateRequest, createValidationErrorResponse, parseAndValidateJSON, detectMaliciousInput } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (2 per hour, 10 per day for delete operations)
    const ipAddress = getIpAddress(req);
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      user.id,
      ipAddress,
      'delete-user'
    );

    if (!rateLimitResult.allowed) {
      await logSuspiciousActivity(supabaseClient, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'delete-user',
        reason: 'rate_limit_exceeded',
        severity: 'high',
        requestDetails: { limit_type: rateLimitResult.limitType }
      });
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Parse and validate request body
    const { data: bodyData, error: parseError } = await parseAndValidateJSON(req);
    if (parseError || !bodyData) {
      return new Response(
        JSON.stringify({ error: parseError || 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request data
    const validation = validateRequest(bodyData, {
      targetUserId: {
        required: true,
        type: 'uuid',
      },
      hardDelete: {
        required: false,
        type: 'boolean',
      }
    });

    if (!validation.valid) {
      await logSuspiciousActivity(supabaseClient, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'delete-user',
        reason: 'invalid_input',
        severity: 'medium',
        requestDetails: { errors: validation.errors }
      });
      return createValidationErrorResponse(validation.errors!, corsHeaders);
    }

    const { targetUserId, hardDelete = false } = validation.sanitizedData!;

    // Check for malicious input
    const maliciousCheck = detectMaliciousInput(targetUserId);
    if (maliciousCheck.isMalicious) {
      await logSuspiciousActivity(supabaseClient, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'delete-user',
        reason: maliciousCheck.reason!,
        severity: 'critical',
        requestDetails: { targetUserId }
      });
      return new Response(
        JSON.stringify({ error: 'Invalid input detected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
    const isOfficeManager = roles?.some(r => r.role === 'office_manager');
    
    if (!isPlatformAdmin && !isOfficeManager) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Office manager can only delete users in their office
    if (isOfficeManager && !isPlatformAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('office_id')
        .eq('id', targetUserId)
        .single();

      const { data: managerProfile } = await supabaseAdmin
        .from('profiles')
        .select('office_id')
        .eq('id', user.id)
        .single();

      if (targetProfile?.office_id !== managerProfile?.office_id) {
        return new Response(
          JSON.stringify({ error: 'Can only delete users in your office' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prevent deleting last platform admin
    const { data: targetRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .is('revoked_at', null);

    if (targetRoles?.some(r => r.role === 'platform_admin')) {
      const { data: allPlatformAdmins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'platform_admin')
        .is('revoked_at', null);

      if (allPlatformAdmins && allPlatformAdmins.length <= 1) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete the last platform admin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get profile for audit
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', targetUserId)
      .single();

    if (hardDelete) {
      // HARD DELETE - Complete removal
      console.log('Performing HARD DELETE for user:', targetUserId);
      
      // 1. Delete auth user completely
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        console.log('Auth user deleted');
      } catch (error) {
        console.error('Failed to delete auth user:', error);
      }

      // 2. Delete profile (cascades to related data via FK constraints)
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

      if (profileDeleteError) {
        console.error('Failed to delete profile:', profileDeleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete user profile', details: profileDeleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Clean up orphaned data
      await supabaseAdmin.from('team_members').delete().eq('user_id', targetUserId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId);
      
    } else {
      // SOFT DELETE IMPLEMENTATION
      // 1. Mark profile as inactive
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          status: 'inactive',
          primary_team_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete user', details: profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Change auth email to allow email reuse
      try {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          email: `${targetUserId}@deleted.local`
        });
      } catch (error) {
        console.error('Failed to update auth email:', error);
      }

      // 3. Ban user for 10 years
      try {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: '87600h'
        });
      } catch (error) {
        console.error('Failed to ban user:', error);
      }

      // 4. Remove team memberships
      await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('user_id', targetUserId);
    }

    // Log deletion
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: hardDelete ? 'user_hard_deleted' : 'user_deleted',
        target_user_id: targetUserId,
        details: {
          deleted_by: user.email,
          deleted_user_email: targetProfile?.email,
          deleted_user_name: targetProfile?.full_name,
          deletion_type: hardDelete ? 'hard' : 'soft',
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: hardDelete ? 'User permanently deleted' : 'User deleted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
