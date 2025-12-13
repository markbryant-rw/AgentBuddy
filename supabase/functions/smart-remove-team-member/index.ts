import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface RemovalOptions {
  userId: string;
  teamId: string;
  taskAction: 'reassign' | 'delete';
  taskAssignee?: string;
  listingAction: 'keep' | 'transfer';
  appraisalAction: 'keep' | 'transfer';
  removeFromConversations: boolean;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has permission (office_manager or platform_admin)
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const hasPermission = roles?.some((r) =>
      ['platform_admin', 'office_manager'].includes(r.role)
    );

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const options: RemovalOptions = await req.json();

    // Get team's office for proper solo agent setup
    const { data: team } = await supabaseClient
      .from('teams')
      .select('agency_id, name')
      .eq('id', options.teamId)
      .single();

    if (!team) {
      return new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user details for audit log
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', options.userId)
      .single();

    // Start transaction-like operations
    const auditDetails: any = {
      team_name: team.name,
      user_name: userProfile?.full_name,
      user_email: userProfile?.email,
      actions: [],
    };

    // 1. Handle Tasks
    if (options.taskAction === 'reassign' && options.taskAssignee) {
      const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('id')
        .eq('assigned_to', options.userId)
        .eq('team_id', options.teamId);

      if (tasks && tasks.length > 0) {
        await supabaseClient
          .from('tasks')
          .update({ assigned_to: options.taskAssignee })
          .eq('assigned_to', options.userId)
          .eq('team_id', options.teamId);

        auditDetails.actions.push({
          type: 'tasks_reassigned',
          count: tasks.length,
          new_assignee: options.taskAssignee,
        });
      }
    } else if (options.taskAction === 'delete') {
      const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('id')
        .eq('assigned_to', options.userId)
        .eq('team_id', options.teamId);

      if (tasks && tasks.length > 0) {
        await supabaseClient
          .from('tasks')
          .delete()
          .eq('assigned_to', options.userId)
          .eq('team_id', options.teamId);

        auditDetails.actions.push({
          type: 'tasks_deleted',
          count: tasks.length,
        });
      }
    }

    // 2. Handle Listings - if transfer, we don't actually reassign, just mark for manual review
    if (options.listingAction === 'transfer') {
      // In a real implementation, you might want to add a flag or notification system
      // For now, we'll just log it
      const { data: listings } = await supabaseClient
        .from('transactions')
        .select('id')
        .or(`assignees->lead_salesperson.eq.${options.userId},assignees->secondary_salesperson.eq.${options.userId}`)
        .eq('team_id', options.teamId);

      if (listings && listings.length > 0) {
        auditDetails.actions.push({
          type: 'listings_flagged_for_transfer',
          count: listings.length,
          note: 'Listings require manual reassignment by team leader',
        });
      }
    }

    // 3. Handle Appraisals - similar to listings
    if (options.appraisalAction === 'transfer') {
      const { data: appraisals } = await supabaseClient
        .from('logged_appraisals')
        .select('id')
        .eq('created_by', options.userId)
        .eq('team_id', options.teamId);

      if (appraisals && appraisals.length > 0) {
        // Could add a flag field if needed
        auditDetails.actions.push({
          type: 'appraisals_marked_team_leads',
          count: appraisals.length,
        });
      }
    }

    // 4. Remove from team conversations
    if (options.removeFromConversations) {
      // Get team conversations the user is part of
      const { data: participations } = await supabaseClient
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(type, channel_type)
        `)
        .eq('user_id', options.userId);

      const teamConversationIds = participations
        ?.filter(
          (p: any) =>
            p.conversations.type === 'group' && p.conversations.channel_type === 'team'
        )
        .map((p) => p.conversation_id);

      if (teamConversationIds && teamConversationIds.length > 0) {
        await supabaseClient
          .from('conversation_participants')
          .delete()
          .eq('user_id', options.userId)
          .in('conversation_id', teamConversationIds);

        auditDetails.actions.push({
          type: 'removed_from_conversations',
          count: teamConversationIds.length,
        });
      }
    }

    // 5. Remove team membership
    await supabaseClient
      .from('team_members')
      .delete()
      .eq('user_id', options.userId)
      .eq('team_id', options.teamId);

    // 6. Check if user has other team memberships
    const { data: remainingTeams } = await supabaseClient
      .from('team_members')
      .select('team_id')
      .eq('user_id', options.userId);

    const hasOtherTeams = remainingTeams && remainingTeams.length > 0;
    const becameSoloAgent = !hasOtherTeams;

    // 7. Update profile based on remaining memberships
    if (becameSoloAgent) {
      // No other teams - become solo agent in the same office
      await supabaseClient
        .from('profiles')
        .update({
          primary_team_id: null,
          office_id: team.agency_id,
        })
        .eq('id', options.userId);
    } else {
      // Check if we removed their primary team
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('primary_team_id')
        .eq('id', options.userId)
        .single();

      if (profile?.primary_team_id === options.teamId) {
        // Set a new primary team from remaining memberships
        const newPrimaryTeamId = remainingTeams[0].team_id;
        await supabaseClient
          .from('profiles')
          .update({ primary_team_id: newPrimaryTeamId })
          .eq('id', options.userId);
        
        auditDetails.actions.push({
          type: 'primary_team_reassigned',
          new_primary_team_id: newPrimaryTeamId,
        });
      }
    }

    auditDetails.actions.push({
      type: 'team_membership_removed',
      became_solo_agent: becameSoloAgent,
      remaining_team_count: remainingTeams?.length || 0,
    });

    // 8. Create audit log
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'smart_team_member_removal',
      target_user_id: options.userId,
      details: auditDetails,
    });

    const statusMessage = becameSoloAgent
      ? `${userProfile?.full_name} has been removed from ${team.name} and is now a solo agent`
      : `${userProfile?.full_name} has been removed from ${team.name} (still a member of ${remainingTeams?.length || 0} other team${remainingTeams?.length === 1 ? '' : 's'})`;

    return new Response(
      JSON.stringify({
        success: true,
        message: statusMessage,
        became_solo_agent: becameSoloAgent,
        remaining_teams: remainingTeams?.length || 0,
        audit: auditDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in smart-remove-team-member:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
