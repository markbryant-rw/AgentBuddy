import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    console.log(`Running cleanup-expired-accounts at ${now}`);

    // Find agencies that should be deleted (paused + past deletion date)
    const { data: expiredAgencies, error: queryError } = await supabaseAdmin
      .from('agencies')
      .select('id, name, scheduled_deletion_date')
      .eq('account_status', 'paused')
      .lte('scheduled_deletion_date', now);

    if (queryError) {
      console.error('Failed to query expired agencies:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query agencies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredAgencies || expiredAgencies.length === 0) {
      console.log('No expired accounts to delete');
      return new Response(
        JSON.stringify({ message: 'No accounts to delete', deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredAgencies.length} expired agencies to delete`);

    const deletedAgencies: string[] = [];
    const failedAgencies: { id: string; error: string }[] = [];

    // Process each expired agency
    for (const agency of expiredAgencies) {
      try {
        console.log(`Deleting agency: ${agency.name} (${agency.id})`);

        // Get all teams in this agency
        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('id')
          .eq('agency_id', agency.id);

        const teamIds = teams?.map(t => t.id) || [];

        // Delete in order to respect foreign key constraints
        // 1. Delete team-scoped data first
        if (teamIds.length > 0) {
          await supabaseAdmin.from('daily_planner_items').delete().in('team_id', teamIds);
          await supabaseAdmin.from('daily_planner_assignments').delete().in('planner_item_id', 
            (await supabaseAdmin.from('daily_planner_items').select('id').in('team_id', teamIds)).data?.map(d => d.id) || []
          );
          await supabaseAdmin.from('tasks').delete().in('team_id', teamIds);
          await supabaseAdmin.from('projects').delete().in('team_id', teamIds);
          await supabaseAdmin.from('logged_appraisals').delete().in('team_id', teamIds);
          await supabaseAdmin.from('listings_pipeline').delete().in('team_id', teamIds);
          await supabaseAdmin.from('transactions').delete().in('team_id', teamIds);
          await supabaseAdmin.from('past_sales').delete().in('team_id', teamIds);
          await supabaseAdmin.from('goals').delete().in('team_id', teamIds);
          await supabaseAdmin.from('service_providers').delete().in('team_id', teamIds);
          await supabaseAdmin.from('integration_settings').delete().in('team_id', teamIds);
          await supabaseAdmin.from('appraisal_stage_templates').delete().in('team_id', teamIds);
        }

        // 2. Delete agency-scoped data
        await supabaseAdmin.from('knowledge_base_cards').delete().eq('agency_id', agency.id);
        await supabaseAdmin.from('knowledge_base_playbooks').delete().eq('agency_id', agency.id);
        await supabaseAdmin.from('knowledge_base_categories').delete().eq('agency_id', agency.id);
        await supabaseAdmin.from('lead_sources').delete().eq('agency_id', agency.id);
        await supabaseAdmin.from('conversations').delete().eq('agency_id', agency.id);

        // 3. Delete team members (before teams and profiles)
        if (teamIds.length > 0) {
          await supabaseAdmin.from('team_members').delete().in('team_id', teamIds);
        }

        // 4. Delete teams
        await supabaseAdmin.from('teams').delete().eq('agency_id', agency.id);

        // 5. Delete office manager assignments
        await supabaseAdmin.from('office_manager_assignments').delete().eq('agency_id', agency.id);

        // 6. Get user IDs for this agency (to clean up user-specific data)
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('office_id', agency.id);

        const userIds = profiles?.map(p => p.id) || [];

        if (userIds.length > 0) {
          // Delete user-specific data
          await supabaseAdmin.from('user_roles').delete().in('user_id', userIds);
          await supabaseAdmin.from('notification_preferences').delete().in('user_id', userIds);
          await supabaseAdmin.from('notifications').delete().in('user_id', userIds);
          await supabaseAdmin.from('google_calendar_connections').delete().in('user_id', userIds);
          await supabaseAdmin.from('calendar_sync_settings').delete().in('user_id', userIds);
          await supabaseAdmin.from('coaching_conversations').delete().in('user_id', userIds);
          await supabaseAdmin.from('notes').delete().in('user_id', userIds);
          await supabaseAdmin.from('kpi_entries').delete().in('user_id', userIds);
          await supabaseAdmin.from('daily_activities').delete().in('user_id', userIds);
          await supabaseAdmin.from('friend_connections').delete().in('user_id', userIds);
          await supabaseAdmin.from('ai_usage_tracking').delete().in('user_id', userIds);
          
          // Delete profiles
          await supabaseAdmin.from('profiles').delete().in('id', userIds);
        }

        // 7. Finally delete the agency itself
        const { error: deleteError } = await supabaseAdmin
          .from('agencies')
          .delete()
          .eq('id', agency.id);

        if (deleteError) {
          throw deleteError;
        }

        // Log the deletion
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            action: 'account_deleted',
            table_name: 'agencies',
            record_id: agency.id,
            details: {
              agency_name: agency.name,
              deletion_reason: '30_day_expiry',
              scheduled_deletion_date: agency.scheduled_deletion_date,
              users_deleted: userIds.length,
              teams_deleted: teamIds.length
            }
          });

        deletedAgencies.push(agency.name);
        console.log(`Successfully deleted agency: ${agency.name}`);

      } catch (error) {
        console.error(`Failed to delete agency ${agency.id}:`, error);
        failedAgencies.push({ id: agency.id, error: String(error) });
      }
    }

    const summary = {
      processed: expiredAgencies.length,
      deleted: deletedAgencies.length,
      failed: failedAgencies.length,
      deletedAgencies,
      failedAgencies: failedAgencies.length > 0 ? failedAgencies : undefined
    };

    console.log('Cleanup complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-expired-accounts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
