import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PostType = 'weekly_reflection' | 'general_update' | 'achievement' | 'milestone' | 'birthday_celebration';
export type PostVisibility = 'public' | 'team_only' | 'friends_only' | 'office_only';
export type ReactionType = 'like' | 'love' | 'celebrate' | 'support' | 'fire';

export interface SocialPost {
  id: string;
  user_id: string;
  post_type: PostType;
  content: string;
  mood?: string;
  reflection_data?: any;
  visibility: PostVisibility;
  is_pinned: boolean;
  metadata: any;
  images?: string[];
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  post_reactions: Array<{
    id: string;
    user_id: string;
    reaction_type: ReactionType;
  }>;
  post_comments: Array<{
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

export function useSocialPosts(userId?: string) {
  return useQuery({
    queryKey: ['social-posts', userId],
    queryFn: async () => {
      let query = supabase
        .from('social_posts' as any)
        .select(`
          *,
          profiles:user_id(id, full_name, avatar_url),
          post_reactions(id, user_id, reaction_type),
          post_comments(
            id,
            content,
            user_id,
            created_at,
            profiles:user_id(full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SocialPost[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: {
      content: string;
      post_type: PostType;
      visibility: PostVisibility;
      mood?: string;
      reflection_data?: any;
      metadata?: any;
      images?: string[];
      mentionedUserIds?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { images, mentionedUserIds, ...postData } = post;
      
      const { data, error } = await supabase
        .from('social_posts' as any)
        .insert({
          user_id: user.id,
          ...postData,
          images: images || [],
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create post - no data returned');

      // Send mention notifications
      if (mentionedUserIds && mentionedUserIds.length > 0 && data !== null) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile && typeof data === 'object') {
          const dataObj = data as Record<string, any>;
          const hasIdField = 'id' in dataObj && typeof dataObj.id === 'string';
          if (hasIdField) {
            const { createMentionNotification } = await import('@/lib/notifications');
            const postId = dataObj.id;
            for (const mentionedUserId of mentionedUserIds) {
              await createMentionNotification(
                mentionedUserId,
                profile.full_name,
                'post',
                postId,
                postId
              );
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success("Post created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_posts' as any)
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success("Post deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      postId, 
      content, 
      visibility 
    }: { 
      postId: string; 
      content: string; 
      visibility?: PostVisibility;
    }) => {
      const { data, error } = await supabase
        .from('social_posts' as any)
        .update({ 
          content, 
          visibility,
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success("Post updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });
}

export function useReactToPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reactionType, postAuthorId }: { 
      postId: string; 
      reactionType: ReactionType;
      postAuthorId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get reactor's profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Check if reaction exists
      const { data: existing, error: existingError } = await supabase
        .from('post_reactions' as any)
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      let shouldNotify = false;

      // Validate existing reaction structure
      if (existing !== null && typeof existing === 'object') {
        const existingObj = existing as Record<string, any>;
        const hasRequiredFields = 'id' in existingObj && 'reaction_type' in existingObj;
        if (hasRequiredFields) {
          const reactionId = existingObj.id as string;
          const existingReactionType = existingObj.reaction_type as string;

          if (existingReactionType === reactionType) {
          // Remove reaction if clicking same type
          const { error } = await supabase
            .from('post_reactions' as any)
            .delete()
            .eq('id', reactionId);
          if (error) throw error;
        } else {
          // Update to new reaction type
          const { error } = await supabase
            .from('post_reactions' as any)
            .update({ reaction_type: reactionType })
            .eq('id', reactionId);
            if (error) throw error;
            shouldNotify = true;
          }
        }
      } else {
        // Create new reaction
        const { error } = await supabase
          .from('post_reactions' as any)
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
        if (error) throw error;
        shouldNotify = true;
      }

      // Send notification if adding/changing reaction and not own post
      if (shouldNotify && postAuthorId !== user.id) {
        const { createPostReactionNotification } = await import('@/lib/notifications');
        await createPostReactionNotification(
          postAuthorId,
          profile?.full_name || 'Someone',
          postId,
          reactionType
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content, postAuthorId }: { 
      postId: string; 
      content: string;
      postAuthorId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get commenter's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('post_comments' as any)
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send notification if not commenting on own post
      if (postAuthorId !== user.id) {
        const { createPostCommentNotification } = await import('@/lib/notifications');
        await createPostCommentNotification(
          postAuthorId,
          profile?.full_name || 'Someone',
          postId,
          content
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}
