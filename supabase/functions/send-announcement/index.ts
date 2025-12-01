import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify user has platform_admin or office_manager role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null)

    const userRoles = roles?.map(r => r.role) || []
    const canSendAnnouncement = userRoles.includes('platform_admin') || userRoles.includes('office_manager')

    if (!canSendAnnouncement) {
      throw new Error('Only platform admins and office managers can send announcements')
    }

    const { title, message, targetType, targetOfficeId } = await req.json()

    console.log('Sending announcement:', { title, targetType, targetOfficeId })

    // Get target user IDs
    let targetUserIds: string[] = []

    if (targetType === 'all' && userRoles.includes('platform_admin')) {
      // Platform-wide announcement
      const { data: allUsers } = await supabaseClient
        .from('profiles')
        .select('id')

      targetUserIds = allUsers?.map(u => u.id) || []
    } else if (targetType === 'office' && targetOfficeId) {
      // Office-wide announcement
      const { data: officeUsers } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('office_id', targetOfficeId)

      targetUserIds = officeUsers?.map(u => u.id) || []
    } else {
      throw new Error('Invalid announcement target')
    }

    if (targetUserIds.length === 0) {
      throw new Error('No users found for announcement')
    }

    // Create or get announcement conversation
    let conversationId: string

    const conversationTitle = targetType === 'all' 
      ? `Platform Announcement: ${title}`
      : `Office Announcement: ${title}`

    // Create new conversation for this announcement
    const { data: newConv, error: convError } = await supabaseClient
      .from('conversations')
      .insert({
        type: 'group',
        channel_type: 'announcement',
        is_system_channel: true,
        title: conversationTitle,
        description: 'System announcement',
        created_by: user.id,
      })
      .select()
      .single()

    if (convError) throw convError
    conversationId = newConv.id

    // Add all target users as participants
    const participants = targetUserIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      is_admin: false,
      can_post: false, // Users cannot reply to announcements
    }))

    const { error: participantsError } = await supabaseClient
      .from('conversation_participants')
      .insert(participants)

    if (participantsError) throw participantsError

    // Post the announcement message
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message,
      })

    if (messageError) throw messageError

    // Create notifications for all participants (except sender)
    const notifications = targetUserIds
      .filter(id => id !== user.id)
      .map(userId => ({
        user_id: userId,
        type: 'announcement',
        title: `New Announcement: ${title}`,
        message: message.substring(0, 100),
        link: `/messages?conversation=${conversationId}`,
      }))

    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (notifError) console.error('Failed to create notifications:', notifError)

    console.log(`Announcement sent to ${targetUserIds.length} users`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId,
        recipientCount: targetUserIds.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending announcement:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
