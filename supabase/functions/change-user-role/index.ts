import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, createRateLimitResponse, getIpAddress, logSuspiciousActivity } from '../_shared/rateLimit.ts';
import { validateRequest, createValidationErrorResponse, parseAndValidateJSON } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create anon client to verify the requesting user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Extract bearer token explicitly to avoid session issues in Edge Functions
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      console.error('Authentication failed: Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (5 per hour, 20 per day for role changes)
    const ipAddress = getIpAddress(req);
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      user.id,
      ipAddress,
      'change-user-role'
    );

    if (!rateLimitResult.allowed) {
      await logSuspiciousActivity(supabaseClient, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'change-user-role',
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

    // Define allowed roles for validation
    const allowedRoles = ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'];

    // Validate request data
    const validation = validateRequest(bodyData, {
      targetUserId: {
        required: true,
        type: 'uuid',
      },
      newRole: {
        required: true,
        type: 'string',
        enum: allowedRoles,
      },
      oldRole: {
        required: false,
        type: 'string',
        enum: allowedRoles,
      }
    });

    if (!validation.valid) {
      await logSuspiciousActivity(supabaseClient, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'change-user-role',
        reason: 'invalid_input',
        severity: 'medium',
        requestDetails: { errors: validation.errors }
      });
      return createValidationErrorResponse(validation.errors!, corsHeaders);
    }

    // Check if user has permission to change roles
    // Allow platform_admin and office_manager
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const hasPermission = roles?.some(r => 
      r.role === 'platform_admin' || r.role === 'office_manager'
    );
    
    if (!hasPermission) {
      console.error('User lacks required permissions');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, newRole, oldRole } = validation.sanitizedData!;

    // Prevent removing the last platform_admin
    if (oldRole === 'platform_admin') {
      const { count } = await supabaseAdmin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'platform_admin')
        .is('revoked_at', null);

      if (count === 1) {
        return new Response(
          JSON.stringify({ error: 'Cannot remove the last platform admin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Revoke old role if provided
    if (oldRole) {
      await supabaseAdmin
        .from('user_roles')
        .update({ 
          revoked_at: new Date().toISOString(),
          revoked_by: user.id
        })
        .eq('user_id', targetUserId)
        .eq('role', oldRole)
        .is('revoked_at', null);
    }

    // Assign new role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        role: newRole,
        assigned_by: user.id,
        assigned_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to assign new role:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'role_changed',
      target_user_id: targetUserId,
      details: { old_role: oldRole, new_role: newRole }
    });

    console.log(`Role changed for user ${targetUserId}: ${oldRole} -> ${newRole}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in change-user-role:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
