import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskComments = (taskId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select(`
          *,
          author:profiles!user_id(id, full_name, avatar_url)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Activity logging skipped - table not implemented
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity", taskId] });
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const editComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_comments")
        .update({ 
          content,
          edited: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast.success("Comment updated");
    },
    onError: () => {
      toast.error("Failed to update comment");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  return {
    comments,
    isLoading,
    addComment: addComment.mutateAsync,
    editComment: editComment.mutateAsync,
    deleteComment: deleteComment.mutateAsync,
  };
};
