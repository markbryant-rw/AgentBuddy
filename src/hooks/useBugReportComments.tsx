import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BugReportComment {
  id: string;
  bug_report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export const useBugReportComments = (bugReportId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['bug-report-comments', bugReportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_report_comments')
        .select('*')
        .eq('bug_report_id', bugReportId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return data.map(comment => ({
          ...comment,
          author: profileMap.get(comment.user_id)
        })) as BugReportComment[];
      }

      return [] as BugReportComment[];
    },
    enabled: !!bugReportId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bug_report_comments')
        .insert({
          bug_report_id: bugReportId,
          user_id: user.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-report-comments', bugReportId] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from('bug_report_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-report-comments', bugReportId] });
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('bug_report_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-report-comments', bugReportId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutateAsync,
    editComment: editCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync,
  };
};
