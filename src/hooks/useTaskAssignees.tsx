import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskAssignees = (taskId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignees = [], isLoading } = useQuery({
    queryKey: ["task-assignees", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_assignees")
        .select(`
          id,
          task_id,
          user_id,
          assigned_by,
          assigned_at,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("task_id", taskId);
      
      if (error) throw error;
      return (data as unknown as TaskAssignee[]) || [];
    },
    enabled: !!taskId,
  });

  const addAssignee = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_assignees")
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id,
        });
      
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["task-assignees", taskId] });
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      
      // Snapshot previous values
      const previousAssignees = queryClient.getQueryData(["task-assignees", taskId]);
      const previousTasks = queryClient.getQueryData(["tasks"]);
      
      // Optimistically update assignees
      queryClient.setQueryData(["task-assignees", taskId], (old: any) => {
        const newAssignee = {
          id: `temp-${Date.now()}`,
          task_id: taskId,
          user_id: userId,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
          user: { id: userId, full_name: "Loading...", avatar_url: null },
        };
        return [...(old || []), newAssignee];
      });
      
      // Show success toast immediately
      toast.success("Assignee added");
      
      return { previousAssignees, previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousAssignees) {
        queryClient.setQueryData(["task-assignees", taskId], context.previousAssignees);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to add assignee");
    },
  });

  const removeAssignee = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["task-assignees", taskId] });
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      
      // Snapshot previous values
      const previousAssignees = queryClient.getQueryData(["task-assignees", taskId]);
      const previousTasks = queryClient.getQueryData(["tasks"]);
      
      // Optimistically remove assignee
      queryClient.setQueryData(["task-assignees", taskId], (old: any) => {
        return (old || []).filter((a: any) => a.user_id !== userId);
      });
      
      // Show success toast immediately
      toast.success("Assignee removed");
      
      return { previousAssignees, previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousAssignees) {
        queryClient.setQueryData(["task-assignees", taskId], context.previousAssignees);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to remove assignee");
    },
  });

  return {
    assignees,
    isLoading,
    addAssignee: addAssignee.mutate,
    removeAssignee: removeAssignee.mutate,
  };
};
