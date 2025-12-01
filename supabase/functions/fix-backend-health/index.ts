import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user is office manager or platform admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const hasPermission = roles?.some(r => 
      r.role === 'platform_admin' || r.role === 'office_manager'
    );

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action } = await req.json();

    let result;
    switch (action) {
      case 'archive_orphaned_profiles':
        result = await archiveOrphanedProfiles(user.id);
        break;
      case 'expire_old_invitations':
        result = await expireOldInvitations(user.id);
        break;
      case 'remove_invalid_invitations':
        result = await removeInvalidInvitations(user.id);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix backend health error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function archiveOrphanedProfiles(actorId: string) {
  // Get orphaned profiles
  const { data: orphans, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .neq('status', 'inactive');

  if (fetchError) throw fetchError;

  const orphanedProfiles = [];
  for (const profile of orphans || []) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (!authUser.user) {
      orphanedProfiles.push(profile);
    }
  }

  if (orphanedProfiles.length === 0) {
    return { success: true, archived: 0 };
  }

  // Archive each orphaned profile
  for (const profile of orphanedProfiles) {
    const archivedEmail = `${profile.id}.archived-${Date.now()}@deleted.local`;
    
    await supabaseAdmin
      .from('profiles')
      .update({
        email: archivedEmail,
        status: 'inactive'
      })
      .eq('id', profile.id);

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'archive_orphaned_profile',
        user_id: actorId,
        target_user_id: profile.id,
        details: {
          original_email: profile.email,
          archived_email: archivedEmail,
          reason: 'Auto-archived orphaned profile without auth user'
        }
      });
  }

  return { success: true, archived: orphanedProfiles.length };
}

async function expireOldInvitations(actorId: string) {
  const { data: expired, error } = await supabaseAdmin
    .from('pending_invitations')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) throw error;

  // Log each expiration
  for (const invitation of expired || []) {
    await supabaseAdmin
      .from('invitation_activity_log')
      .insert({
        invitation_id: invitation.id,
        activity_type: 'expired',
        actor_id: actorId,
        recipient_email: invitation.email,
        team_id: invitation.team_id,
        office_id: invitation.office_id,
        metadata: { auto_expired: true }
      });
  }

  return { success: true, expired: expired?.length || 0 };
}

async function removeInvalidInvitations(actorId: string) {
  // Get invalid invitations
  const { data: invitations, error: fetchError } = await supabaseAdmin
    .from('pending_invitations')
    .select('*, teams(id), agencies:office_id(id)')
    .eq('status', 'pending');

  if (fetchError) throw fetchError;

  const invalidInvitations = (invitations || []).filter(inv => 
    (inv.team_id && !inv.teams) || (inv.office_id && !inv.agencies)
  );

  if (invalidInvitations.length === 0) {
    return { success: true, removed: 0 };
  }

  // Remove invalid invitations
  const invalidIds = invalidInvitations.map(inv => inv.id);
  await supabaseAdmin
    .from('pending_invitations')
    .delete()
    .in('id', invalidIds);

  // Log the removals
  for (const invitation of invalidInvitations) {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'remove_invalid_invitation',
        user_id: actorId,
        details: {
          email: invitation.email,
          team_id: invitation.team_id,
          office_id: invitation.office_id,
          reason: invitation.team_id && !invitation.teams 
            ? 'team_not_found' 
            : 'office_not_found'
        }
      });
  }

  return { success: true, removed: invalidInvitations.length };
}
