import { supabase } from '@/integrations/supabase/client';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
}: CreateNotificationParams) {
  try {
    // Check if user has this notification type enabled using the database function
    const { data: shouldSend } = await supabase.rpc('should_send_notification', {
      p_user_id: userId,
      p_notification_type: type,
    });

    if (!shouldSend) {
      console.log(`Notification skipped for user ${userId} - type ${type} disabled in preferences`);
      return null;
    }

    // Create notification with 30-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
        expires_at: expiresAt.toISOString(),
        read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function createPostReactionNotification(
  postAuthorId: string,
  reactorName: string,
  postId: string,
  reactionType: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Don't notify if user reacted to their own post
  if (user?.id === postAuthorId) return;

  const emoji = reactionType === 'like' ? '👍' : reactionType === 'love' ? '❤️' : reactionType === 'celebrate' ? '🎉' : '😮';

  await createNotification({
    userId: postAuthorId,
    type: 'post_reaction',
    title: 'New Reaction',
    message: `${reactorName} reacted ${emoji} to your post`,
    metadata: { postId, reactionType, reactorId: user?.id },
  });
}

export async function createPostCommentNotification(
  postAuthorId: string,
  commenterName: string,
  postId: string,
  commentPreview: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Don't notify if user commented on their own post
  if (user?.id === postAuthorId) return;

  await createNotification({
    userId: postAuthorId,
    type: 'post_comment',
    title: 'New Comment',
    message: `${commenterName} commented: "${commentPreview.substring(0, 50)}${commentPreview.length > 50 ? '...' : ''}"`,
    metadata: { postId, commenterId: user?.id },
  });
}

export async function createCommentReplyNotification(
  parentCommentAuthorId: string,
  replierName: string,
  postId: string,
  replyPreview: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Don't notify if user replied to their own comment
  if (user?.id === parentCommentAuthorId) return;

  await createNotification({
    userId: parentCommentAuthorId,
    type: 'comment_reply',
    title: 'Reply to Your Comment',
    message: `${replierName} replied: "${replyPreview.substring(0, 50)}${replyPreview.length > 50 ? '...' : ''}"`,
    metadata: { postId, replierId: user?.id },
  });
}

export async function createAchievementNotification(
  friendId: string,
  achieverName: string,
  achievementName: string,
  achievementId: string
) {
  await createNotification({
    userId: friendId,
    type: 'friend_achievement',
    title: 'Friend Achievement! 🏆',
    message: `${achieverName} unlocked: ${achievementName}`,
    metadata: { achievementId, achieverId: friendId },
  });
}

export async function createMentionNotification(
  mentionedUserId: string,
  mentionerName: string,
  contentType: 'post' | 'comment',
  contentId: string,
  postId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Don't notify if user mentioned themselves
  if (user?.id === mentionedUserId) return;

  await createNotification({
    userId: mentionedUserId,
    type: 'mention',
    title: `${mentionerName} mentioned you`,
    message: `${mentionerName} mentioned you in a ${contentType}`,
    metadata: {
      content_type: contentType,
      content_id: contentId,
      post_id: postId,
      mentioner_id: user?.id,
    },
  });
}

export async function createServiceProviderNotification(
  providerId: string,
  providerName: string,
  categoryName: string | null,
  creatorName: string,
  creatorId: string,
  agencyId: string
) {
  try {
    // Get all office members EXCEPT the creator
    const { data: officeMembers } = await supabase
      .from('team_members')
      .select(`
        user_id,
        teams!inner(agency_id)
      `)
      .eq('teams.agency_id', agencyId)
      .neq('user_id', creatorId);

    if (!officeMembers || officeMembers.length === 0) {
      console.log('No office members to notify');
      return;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(officeMembers.map(m => m.user_id))];

    // Create notifications for all office members
    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      type: 'service_provider_added',
      title: 'New Service Provider Added 🔧',
      message: `${creatorName} added ${providerName}${categoryName ? ` (${categoryName})` : ''} to the office directory`,
      metadata: {
        provider_id: providerId,
        creator_id: creatorId,
        category: categoryName,
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
    }));

    // Batch insert notifications
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating service provider notifications:', error);
    } else {
      console.log(`Created ${notifications.length} notifications for new provider`);
    }
  } catch (error) {
    console.error('Error in createServiceProviderNotification:', error);
  }
}

export async function createOfficeManagerReviewTask(
  newProviderName: string,
  newProviderId: string,
  existingProviderName: string,
  existingProviderId: string,
  matchReason: string,
  officeId: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('help_requests')
      .insert({
        title: `Possible Duplicate Provider: ${newProviderName}`,
        description: `A new provider "${newProviderName}" was added that may be a duplicate of "${existingProviderName}". Reason: ${matchReason}`,
        category: 'provider_duplicate_review',
        office_id: officeId,
        created_by: user?.id || '',
        metadata: {
          new_provider_id: newProviderId,
          existing_provider_id: existingProviderId,
          match_reason: matchReason,
        },
        escalation_level: 'office_manager',
        status: 'open',
      });

    if (error) {
      console.error('Error creating review task:', error);
    }
  } catch (error) {
    console.error('Error in createOfficeManagerReviewTask:', error);
  }
}

export async function clearProviderFlag(providerId: string) {
  try {
    const { error } = await supabase
      .from('service_providers')
      .update({
        flagged_at: null,
        last_flag_cleared_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (error) {
      console.error('Error clearing provider flag:', error);
    }
  } catch (error) {
    console.error('Error in clearProviderFlag:', error);
  }
}

