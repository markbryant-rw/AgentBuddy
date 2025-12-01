// PHASE 2: Edge function for optimized board data fetching
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';



interface BoardDataRequest {
  boardId: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { boardId, userId }: BoardDataRequest = await req.json();

    if (!boardId || !userId) {
      return new Response(
        JSON.stringify({ error: 'boardId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's team
    const { data: teamMemberData, error: teamError } = await supabaseClient
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .single();

    if (teamError || !teamMemberData) {
      return new Response(
        JSON.stringify({ error: 'User not in a team' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch board, lists, and tasks in parallel using the enriched view
    const [boardResult, listsResult, tasksResult] = await Promise.all([
      // Fetch board
      supabaseClient
        .from('task_boards')
        .select('id, team_id, name, description, created_at, updated_at, created_by')
        .eq('id', boardId)
        .eq('team_id', teamMemberData.team_id)
        .single(),

      // Fetch lists
      supabaseClient
        .from('task_lists')
        .select('id, board_id, team_id, name, order_position, created_at, updated_at')
        .eq('board_id', boardId)
        .eq('team_id', teamMemberData.team_id)
        .order('order_position', { ascending: true }),
      
      // Fetch tasks with enriched data (using view if available, fallback to regular query)
      supabaseClient
        .from('tasks')
        .select(`
          id, team_id, title, description, list_id, project_id,
          assigned_to, created_by, due_date, completed, completed_at,
          priority, listing_id, last_updated_by, board_position,
          created_at, updated_at, parent_task_id, is_urgent, is_important
        `)
        .eq('team_id', teamMemberData.team_id)
        .in('list_id', []) // Will be filled after getting list IDs
        .is('transaction_id', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50)
    ]);

    if (boardResult.error) throw boardResult.error;
    if (listsResult.error) throw listsResult.error;

    const board = boardResult.data;
    const lists = listsResult.data || [];
    const listIds = lists.map(l => l.id);

    // Refetch tasks with correct list filter
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select(`
        id, team_id, title, description, list_id, project_id,
        assigned_to, created_by, due_date, completed, completed_at,
        priority, listing_id, last_updated_by, board_position,
        created_at, updated_at, parent_task_id, is_urgent, is_important
      `)
      .eq('team_id', teamMemberData.team_id)
      .in('list_id', listIds)
      .is('transaction_id', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(50);

    if (tasksError) throw tasksError;

    // Return optimized payload
    return new Response(
      JSON.stringify({
        board,
        lists,
        tasks: tasks || [],
        metadata: {
          fetchedAt: new Date().toISOString(),
          tasksCount: tasks?.length || 0,
          listsCount: lists.length,
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching board data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
