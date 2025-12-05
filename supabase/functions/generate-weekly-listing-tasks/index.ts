import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyTaskTemplate {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  default_size_category: string;
  is_active: boolean;
}

interface Transaction {
  id: string;
  address: string;
  team_id: string;
  agent_id: string | null;
  created_by: string;
  include_weekly_tasks: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { teamId, listingIds, manual } = body;

    // Calculate the week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log(`Generating weekly tasks for week starting ${weekStartStr}`);

    // Get teams with weekly tasks enabled
    let settingsQuery = supabase
      .from('weekly_task_settings')
      .select('team_id')
      .eq('enabled', true);

    if (teamId) {
      settingsQuery = settingsQuery.eq('team_id', teamId);
    }

    const { data: enabledTeams, error: settingsError } = await settingsQuery;
    if (settingsError) throw settingsError;

    if (!enabledTeams || enabledTeams.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No teams with weekly tasks enabled', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIds = enabledTeams.map(t => t.team_id);
    console.log(`Found ${teamIds.length} teams with weekly tasks enabled`);

    // Get templates for these teams
    const { data: templates, error: templatesError } = await supabase
      .from('weekly_task_templates')
      .select('*')
      .in('team_id', teamIds)
      .eq('is_active', true);

    if (templatesError) throw templatesError;
    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active templates found', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active transactions (live, contract, unconditional stages) with weekly tasks enabled
    let transactionsQuery = supabase
      .from('transactions')
      .select('id, address, team_id, agent_id, created_by, include_weekly_tasks')
      .in('team_id', teamIds)
      .in('stage', ['live', 'contract', 'unconditional'])
      .eq('archived', false)
      .eq('include_weekly_tasks', true);

    if (listingIds && listingIds.length > 0) {
      transactionsQuery = transactionsQuery.in('id', listingIds);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;
    if (transactionsError) throw transactionsError;

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active transactions found', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${transactions.length} active transactions`);

    // Check existing tasks for this week to avoid duplicates
    const { data: existingTasks, error: existingError } = await supabase
      .from('tasks')
      .select('transaction_id, weekly_template_id')
      .eq('is_weekly_recurring', true)
      .eq('generated_for_week', weekStartStr);

    if (existingError) throw existingError;

    const existingSet = new Set(
      (existingTasks || []).map(t => `${t.transaction_id}-${t.weekly_template_id}`)
    );

    // Generate tasks
    const tasksToCreate: any[] = [];
    const notificationsToCreate: Map<string, number> = new Map(); // userId -> count

    for (const transaction of transactions) {
      const teamTemplates = templates.filter(t => t.team_id === transaction.team_id);
      
      for (const template of teamTemplates) {
        const key = `${transaction.id}-${template.id}`;
        if (existingSet.has(key)) {
          continue; // Skip if already exists
        }

        // Calculate due date for this task (based on day_of_week)
        const dueDate = new Date(weekStart);
        dueDate.setDate(weekStart.getDate() + (template.day_of_week - 1));
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const assignedTo = transaction.agent_id || transaction.created_by;

        tasksToCreate.push({
          title: `${template.title}: ${transaction.address}`,
          description: template.description,
          transaction_id: transaction.id,
          team_id: transaction.team_id,
          assigned_to: assignedTo,
          due_date: dueDateStr,
          priority: template.default_size_category === 'big' ? 'high' : 
                   template.default_size_category === 'little' ? 'low' : 'medium',
          is_weekly_recurring: true,
          weekly_template_id: template.id,
          generated_for_week: weekStartStr,
          completed: false,
        });

        // Track notification counts per user
        if (assignedTo) {
          notificationsToCreate.set(
            assignedTo,
            (notificationsToCreate.get(assignedTo) || 0) + 1
          );
        }
      }
    }

    console.log(`Creating ${tasksToCreate.length} new tasks`);

    // Insert tasks in batches
    let tasksCreated = 0;
    const batchSize = 100;
    for (let i = 0; i < tasksToCreate.length; i += batchSize) {
      const batch = tasksToCreate.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting tasks batch:', insertError);
      } else {
        tasksCreated += batch.length;
      }
    }

    // Create notifications for each agent
    for (const [userId, count] of notificationsToCreate) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'weekly_tasks_generated',
        title: '📋 Weekly Tasks Ready',
        message: `${count} new weekly listing tasks have been added to your Daily Planner.`,
        action_url: '/daily-planner',
      });
    }

    console.log(`Successfully created ${tasksCreated} tasks and ${notificationsToCreate.size} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        tasksCreated,
        notificationsSent: notificationsToCreate.size,
        weekStart: weekStartStr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating weekly tasks:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
