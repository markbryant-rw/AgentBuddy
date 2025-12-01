import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

interface MergeUsersRequest {
  keepUserId: string;
  removeUserId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is platform admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Platform Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { keepUserId, removeUserId }: MergeUsersRequest = await req.json();

    console.log(`[merge-duplicate-users] Starting merge: keep=${keepUserId}, remove=${removeUserId}`);

    // Verify both users exist
    const { data: keepUser } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', keepUserId)
      .single();

    const { data: removeUser } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', removeUserId)
      .single();

    if (!keepUser || !removeUser) {
      return new Response(JSON.stringify({ error: 'One or both users not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transfer data from removeUser to keepUser (only if keepUser doesn't already have data)
    const tables = [
      'team_members',
      'tasks',
      'logged_appraisals',
      'listings_pipeline',
      'transactions',
      'notes',
      'coaching_conversations',
      'social_posts',
      'kpi_entries'
    ];

    for (const table of tables) {
      try {
        // Check if keepUser already has data in this table
        const { count: keepCount } = await supabaseClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', keepUserId);

        // Only transfer if keepUser has no data
        if (keepCount === 0) {
          await supabaseClient
            .from(table)
            .update({ user_id: keepUserId })
            .eq('user_id', removeUserId);
          
          console.log(`[merge-duplicate-users] Transferred ${table} records`);
        }
      } catch (error: any) {
        console.log(`[merge-duplicate-users] Skipping ${table}: ${error.message}`);
      }
    }

    // Hard delete the duplicate user's auth account
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(removeUserId);
    if (deleteAuthError) {
      console.error('[merge-duplicate-users] Failed to delete auth user:', deleteAuthError);
    }

    // Hard delete the profile (cascade should handle related records)
    const { error: deleteProfileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', removeUserId);

    if (deleteProfileError) {
      console.error('[merge-duplicate-users] Failed to delete profile:', deleteProfileError);
      return new Response(JSON.stringify({ error: 'Failed to delete duplicate user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the merge operation
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'merge_duplicate_users',
        user_id: user.id,
        details: {
          kept_user: { id: keepUser.id, email: keepUser.email, name: keepUser.full_name },
          removed_user: { id: removeUser.id, email: removeUser.email, name: removeUser.full_name },
          merged_at: new Date().toISOString()
        }
      });

    console.log(`[merge-duplicate-users] Successfully merged users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully merged ${removeUser.email} into ${keepUser.email}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[merge-duplicate-users] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

