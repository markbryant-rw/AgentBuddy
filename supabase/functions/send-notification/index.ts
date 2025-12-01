import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, createRateLimitResponse, getIpAddress, logSuspiciousActivity } from '../_shared/rateLimit.ts';
import { validateRequest, createValidationErrorResponse, parseAndValidateJSON } from '../_shared/validation.ts';

interface NotificationRequest {
  title: string;
  message: string;
  type: string;
  targetType: 'all' | 'team' | 'office' | 'user';
  targetId?: string;
  expiresInDays?: number;
  displayAsBanner?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is platform admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (50 per hour, 200 per day for notifications)
    const ipAddress = getIpAddress(req);
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      ipAddress,
      'send-notification'
    );

    if (!rateLimitResult.allowed) {
      await logSuspiciousActivity(supabase, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'send-notification',
        reason: 'rate_limit_exceeded',
        severity: 'medium',
        requestDetails: { limit_type: rateLimitResult.limitType }
      });
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'platform_admin')
      .single();

    if (roleError || !userRoles) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      title: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      message: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 1000,
      },
      type: {
        required: true,
        type: 'string',
        maxLength: 50,
      },
      targetType: {
        required: true,
        type: 'string',
        enum: ['all', 'team', 'office', 'user'],
      },
      targetId: {
        required: false,
        type: 'uuid',
      },
      expiresInDays: {
        required: false,
        type: 'number',
        min: 1,
        max: 365,
      },
      displayAsBanner: {
        required: false,
        type: 'boolean',
      },
      actionUrl: {
        required: false,
        type: 'string',
        maxLength: 500,
      },
      actionLabel: {
        required: false,
        type: 'string',
        maxLength: 100,
      }
    });

    if (!validation.valid) {
      await logSuspiciousActivity(supabase, {
        userId: user.id,
        ipAddress: ipAddress || undefined,
        actionType: 'send-notification',
        reason: 'invalid_input',
        severity: 'low',
        requestDetails: { errors: validation.errors }
      });
      return createValidationErrorResponse(validation.errors!, corsHeaders);
    }

    const { title, message, type, targetType, targetId, expiresInDays = 7, displayAsBanner = false, actionUrl, actionLabel } = validation.sanitizedData! as NotificationRequest;

    console.log('Sending notification:', { title, type, targetType, targetId });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    let recipientIds: string[] = [];

    // Get recipient user IDs based on target type
    if (targetType === 'all') {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (error) throw error;
      recipientIds = users.map(u => u.id);

    } else if (targetType === 'team') {
      if (!targetId) throw new Error('Team ID required');
      
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', targetId);

      if (error) throw error;
      recipientIds = teamMembers.map(tm => tm.user_id);

    } else if (targetType === 'office') {
      if (!targetId) throw new Error('Office ID required');
      
      // First get all teams in the office
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', targetId);

      if (teamsError) throw teamsError;
      const teamIds = teams.map(t => t.id);

      // Then get all members of those teams
      const { data: officeMembers, error } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds);

      if (error) throw error;
      recipientIds = officeMembers.map(om => om.user_id);

    } else if (targetType === 'user') {
      if (!targetId) throw new Error('User ID required');
      recipientIds = [targetId];
    }

    // Remove duplicates
    recipientIds = [...new Set(recipientIds)];

    console.log(`Creating notifications for ${recipientIds.length} users`);

    // Create notification records for all recipients
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      read: false,
      sent_by: user.id,
      target_type: targetType,
      target_id: targetId || null,
      expires_at: expiresAt.toISOString(),
      display_as_banner: displayAsBanner,
      metadata: {
        sent_at: new Date().toISOString(),
        sender_name: user.email,
        action_url: actionUrl,
        action_label: actionLabel,
      },
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error } = await supabase
        .from('notifications')
        .insert(batch);

      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }
      successCount += batch.length;
    }

    console.log(`Successfully created ${successCount} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientCount: successCount,
        targetType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
