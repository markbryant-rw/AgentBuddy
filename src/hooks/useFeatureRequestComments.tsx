import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureRequestComment {
  id: string;
  feature_request_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useFeatureRequestComments = (featureRequestId: string) => {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['feature-request-comments', featureRequestId],
    queryFn: async (): Promise<FeatureRequestComment[]> => {
      const { data, error } = await supabase
        .from('feature_request_comments')
        .select('*')
        .eq('feature_request_id', featureRequestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const enrichedComments = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile || { full_name: null, avatar_url: null },
          };
        })
      );

      return enrichedComments;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feature_request_comments')
        .insert({
          feature_request_id: featureRequestId,
          user_id: user.id,
          comment,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-request-comments', featureRequestId] });
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add comment');
      console.error('Error adding comment:', error);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('feature_request_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-request-comments', featureRequestId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete comment');
      console.error('Error deleting comment:', error);
    },
  });

  return {
    comments,
    isLoading,
    addComment: (comment: string) => addCommentMutation.mutate(comment),
    deleteComment: (commentId: string) => deleteCommentMutation.mutate(commentId),
    isAdding: addCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
  };
};
