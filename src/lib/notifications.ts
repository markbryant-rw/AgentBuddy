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
    // Stub: should_send_notification RPC not implemented - always send
    const shouldSend = true;

    if (!shouldSend) {
      console.log(`Notification skipped for user ${userId} - type ${type} disabled in preferences`);
      return null;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
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

    const uniqueUserIds = [...new Set(officeMembers.map(m => m.user_id))];

    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      type: 'service_provider_added',
      title: 'New Service Provider Added 🔧',
      message: `${creatorName} added ${providerName}${categoryName ? ` (${categoryName})` : ''} to the office directory`,
      is_read: false,
    }));

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
  // Stubbed - help_requests table not available
  console.log('createOfficeManagerReviewTask: Stubbed - help_requests table not implemented');
}

export async function clearProviderFlag(providerId: string) {
  // Stubbed - flagged_at column doesn't exist on service_providers
  console.log('clearProviderFlag: Stubbed - flagged_at column not implemented');
}
