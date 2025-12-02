import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  list_id: string | null;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  listing_id: string | null;
  last_updated_by: string | null;
  board_position: number;
  is_urgent: boolean;
  is_important: boolean;
  created_at: string;
  updated_at: string;
  parent_task_id?: string | null;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  assignees?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  creator?: {
    id: string;
    full_name: string | null;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  subtasks?: Task[];
  subtaskProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export const useTasks = (boardId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", boardId],
    queryFn: async () => {
      if (!user) return [];

      // Get user's team
      const { data: teamMemberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!teamMemberData) return [];

      // Build query to get tasks - use any cast to bypass type checking for new columns
      let query = (supabase as any)
        .from("tasks")
        .select(`
          id, team_id, title, description, list_id, project_id,
          assigned_to, created_by, due_date, completed, completed_at,
          priority, listing_id, last_updated_by, board_position,
          created_at, updated_at, parent_task_id, transaction_id,
          is_urgent, is_important, order_position
        `)
        .eq("team_id", teamMemberData.team_id)
        .is("transaction_id", null); // EXCLUDE transaction tasks

      // Filter by board's lists if boardId provided
      if (boardId) {
        const { data: boardLists } = await supabase
          .from('task_lists' as any)
          .select('id')
          .eq('board_id', boardId);

        const listIds = (boardLists as any[])?.map((l: any) => l.id) || [];
        if (listIds.length > 0) {
          query = query.in('list_id', listIds);
        } else {
          // No lists in this board, return empty
          return [];
        }
      }

      const { data: tasksData, error: tasksError } = await query
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50); // PHASE 2: Reduced from 100 to 50 for pagination

      if (tasksError) throw tasksError;
      if (!tasksData) return [];

      // Include ALL tasks (parents AND subtasks) 
      const allTasks = tasksData;

      // Separate parent tasks and subtasks
      const parentTasks = allTasks.filter(t => !t.parent_task_id);
      const subtasksByParent = allTasks
        .filter(t => t.parent_task_id)
        .reduce((acc, subtask) => {
          if (!acc[subtask.parent_task_id!]) acc[subtask.parent_task_id!] = [];
          acc[subtask.parent_task_id!].push(subtask);
          return acc;
        }, {} as Record<string, any[]>);

      // PHASE 1: PARALLELIZE - Fetch assignees, profiles, and tags simultaneously
      const taskIds = allTasks.map((t: any) => t.id) as string[];
      const userIds = [...new Set(
        tasksData
          .map((t: any) => t.created_by)
          .filter((id): id is string => typeof id === 'string' && id !== null)
      )] as string[];

      // Fetch all data in parallel
      const assigneesPromise = supabase
        .from("task_assignees")
        .select(`
          task_id,
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .in("task_id", taskIds);

      const profilesPromise = userIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds)
        : Promise.resolve({ data: [], error: null });

      const tagAssignmentsPromise = taskIds.length > 0
        ? supabase
            .from('task_tag_assignments' as any)
            .select('task_id, tag_id')
            .in('task_id', taskIds)
        : Promise.resolve({ data: [], error: null });

      const [
        { data: assigneesData },
        { data: profilesData },
        { data: tagAssignments }
      ] = await Promise.all([assigneesPromise, profilesPromise, tagAssignmentsPromise]);

      // Map assignees to tasks
      const assigneesMap = (assigneesData || []).reduce((acc, assignee: any) => {
        if (!acc[assignee.task_id]) {
          acc[assignee.task_id] = [];
        }
        acc[assignee.task_id].push(assignee.profiles);
        return acc;
      }, {} as Record<string, any[]>);

      // Map creator profiles
      const usersMap = (profilesData || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Fetch tag details and build tagsMap
      let tagsMap: Record<string, any[]> = {};
      const tagIds = [...new Set((tagAssignments || []).map((t: any) => t.tag_id).filter(Boolean))];
      
      if (tagIds.length > 0) {
        const { data: tagsDetails } = await supabase
          .from('task_tags' as any)
          .select('id, name, color')
          .in('id', tagIds);

        const tagsById = (tagsDetails || []).reduce((acc: any, tag: any) => {
          acc[tag.id] = tag;
          return acc;
        }, {});

        tagsMap = (tagAssignments || []).reduce((acc, item: any) => {
          if (!acc[item.task_id]) acc[item.task_id] = [];
          if (tagsById[item.tag_id]) {
            acc[item.task_id].push(tagsById[item.tag_id]);
          }
          return acc;
        }, {} as Record<string, any[]>);
      }

      // Helper to calculate subtask progress
      const calculateProgress = (subtasks: any[]) => {
        const total = subtasks.length;
        const completed = subtasks.filter(s => s.completed).length;
        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      };

      // Map subtasks with their data
      const enrichSubtasks = (subtasks: any[]) => {
        return subtasks.map(subtask => ({
          ...subtask,
          tags: tagsMap[subtask.id] || [],
          assignees: assigneesMap[subtask.id] || [],
          assignee: subtask.assigned_to && usersMap[subtask.assigned_to]
            ? usersMap[subtask.assigned_to]
            : undefined,
          creator: subtask.created_by && usersMap[subtask.created_by]
            ? { id: usersMap[subtask.created_by].id, full_name: usersMap[subtask.created_by].full_name }
            : undefined,
        }));
      };

      // Return only parent tasks with enriched subtasks and progress
      return (parentTasks.map((task) => {
        const taskSubtasks = subtasksByParent[task.id] || [];
        const enrichedSubtasks = enrichSubtasks(taskSubtasks);
        
        return {
          ...task,
          tags: tagsMap[task.id] || [],
          assignees: assigneesMap[task.id] || [],
          assignee: task.assigned_to && usersMap[task.assigned_to]
            ? usersMap[task.assigned_to]
            : undefined,
          creator: task.created_by && usersMap[task.created_by]
            ? { id: usersMap[task.created_by].id, full_name: usersMap[task.created_by].full_name }
            : undefined,
          subtasks: enrichedSubtasks,
          subtaskProgress: enrichedSubtasks.length > 0 
            ? calculateProgress(enrichedSubtasks)
            : undefined,
        };
      }) as unknown) as Task[];
    },
    enabled: !!user,
    // PHASE 1: Stale-while-revalidate strategy for instant perceived load
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });

  const createTask = useMutation({
    mutationFn: async ({
      title,
      description,
      dueDate,
      listId,
      isUrgent,
      isImportant,
    }: {
      title: string;
      description?: string;
      dueDate?: string;
      listId: string;
      isUrgent?: boolean;
      isImportant?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get user's team
      const { data: teamMemberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!teamMemberData) throw new Error("User is not part of a team");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          team_id: teamMemberData.team_id,
          title,
          description,
          due_date: dueDate,
          list_id: listId,
          created_by: user.id,
          last_updated_by: user.id,
          completed: false,
          is_urgent: isUrgent || false,
          is_important: isImportant || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", boardId]);

      // Get user's team for optimistic update
      const { data: teamMemberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user!.id)
        .single();

      if (previousTasks && teamMemberData) {
        // Optimistically update to the new value
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          title: newTask.title,
          description: newTask.description || null,
          due_date: newTask.dueDate || null,
          list_id: newTask.listId,
          project_id: null,
          assigned_to: null,
          completed: false,
          completed_at: null,
          created_by: user!.id,
          created_at: new Date().toISOString(),
          last_updated_by: user!.id,
          team_id: teamMemberData.team_id,
          board_position: 0,
          priority: null,
          listing_id: null,
          is_urgent: newTask.isUrgent || false,
          is_important: newTask.isImportant || false,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<Task[]>(["tasks", boardId], [...previousTasks, optimisticTask]);
      }

      return { previousTasks };
    },
    onSuccess: (data) => {
      // Replace the optimistic task with the real one
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", boardId]);
      if (previousTasks) {
        const updatedTasks = previousTasks.filter(t => !t.id.startsWith('temp-'));
        queryClient.setQueryData<Task[]>(["tasks", boardId], [...updatedTasks, data as Task]);
      }
      toast.success("Task created");
    },
    onError: (error, variables, context) => {
      // Rollback to previous state
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      toast.error("Failed to create task");
      console.error(error);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Omit<Task, 'id' | 'created_at' | 'assignee' | 'creator'>>;
    }) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Verify session is valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expired - please sign in again");
      }

      // Add last_updated_by to updates
      const updatesWithUser = {
        ...updates,
        last_updated_by: user.id,
      };

      const { data, error } = await supabase
        .from("tasks")
        .update(updatesWithUser)
        .eq("id", taskId)
        .select('*');

      if (error) {
        console.error('Task update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          taskId,
          updates: updatesWithUser,
        });
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No rows were updated - you may not have permission to update this task');
      }

      return data[0];
    },
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });
      const previousTasks = queryClient.getQueryData(["tasks", boardId]);
      
      queryClient.setQueryData(["tasks", boardId], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId 
            ? { ...task, ...updates }
            : task
        );
      });
      
      return { previousTasks };
    },
    onSuccess: (returnedData) => {
      queryClient.setQueryData(["tasks", boardId], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => {
          if (task.id === returnedData.id) {
            return {
              ...task,
              ...returnedData,
              assignee: task.assignee,
              assignees: task.assignees,
              creator: task.creator,
              tags: task.tags,
            };
          }
          return task;
        });
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      
      const errorMessage = error?.message || "Failed to update task";
      const isRLSError = errorMessage.includes('permission') || errorMessage.includes('policy') || error?.code === '42501';
      
      if (isRLSError) {
        toast.error("You don't have permission to update this task");
      } else if (errorMessage.includes('Session expired')) {
        toast.error("Session expired - please refresh the page");
      } else {
        toast.error("Failed to update task");
      }
      
      console.error('Task update failed:', {
        error: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Verify session is valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expired - please sign in again");
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          last_updated_by: user.id,
        })
        .eq("id", taskId)
        .select('*');

      if (error) {
        console.error('Task complete error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          taskId,
        });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No rows were updated - you may not have permission to complete this task');
      }

      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });
      const previousTasks = queryClient.getQueryData(["tasks", boardId]);
      
      queryClient.setQueryData(["tasks", boardId], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId 
            ? { 
                ...task, 
                completed: true, 
                completed_at: new Date().toISOString() 
              }
            : task
        );
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      toast.success("Task completed! 🎉");
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
    onError: (error: any, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      
      const errorMessage = error?.message || "Failed to complete task";
      const isRLSError = errorMessage.includes('permission') || errorMessage.includes('policy') || error?.code === '42501';
      
      if (isRLSError) {
        toast.error("You don't have permission to complete this task");
      } else if (errorMessage.includes('Session expired')) {
        toast.error("Session expired - please refresh the page");
      } else {
        toast.error("Failed to complete task");
      }
      
      console.error('Task complete failed:', {
        error: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    },
  });

  const uncompleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Verify session is valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expired - please sign in again");
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed: false,
          completed_at: null,
          last_updated_by: user.id,
        })
        .eq("id", taskId)
        .select('*');

      if (error) {
        console.error('Task uncomplete error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          taskId,
        });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No rows were updated - you may not have permission to update this task');
      }

      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });
      const previousTasks = queryClient.getQueryData(["tasks", boardId]);
      
      queryClient.setQueryData(["tasks", boardId], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId 
            ? { 
                ...task, 
                completed: false, 
                completed_at: null 
              }
            : task
        );
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
    onError: (error: any, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      
      const errorMessage = error?.message || "Failed to update task";
      const isRLSError = errorMessage.includes('permission') || errorMessage.includes('policy') || error?.code === '42501';
      
      if (isRLSError) {
        toast.error("You don't have permission to update this task");
      } else if (errorMessage.includes('Session expired')) {
        toast.error("Session expired - please refresh the page");
      } else {
        toast.error("Failed to update task");
      }
      
      console.error('Task uncomplete failed:', {
        error: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    },
  });

  const addAssignee = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      toast.success("Assignee added");
    },
    onError: (error) => {
      toast.error("Failed to add assignee");
      console.error(error);
    },
  });

  const removeAssignee = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      toast.success("Assignee removed");
    },
    onError: (error) => {
      toast.error("Failed to remove assignee");
      console.error(error);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });
      const previousTasks = queryClient.getQueryData(["tasks", boardId]);
      
      queryClient.setQueryData(["tasks", boardId], (old: any) => {
        if (!old) return old;
        return old.filter((task: any) => task.id !== taskId);
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      toast.success("Task deleted");
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      toast.error("Failed to delete task");
      console.error(error);
    },
  });

  const duplicateTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Fetch original task
      const { data: original, error: fetchError } = await supabase
        .from("tasks")
        .select(`
          team_id, title, description, priority, list_id,
          due_date, listing_id, project_id
        `)
        .eq("id", taskId)
        .single();

      if (fetchError || !original) throw fetchError || new Error("Task not found");

      // Create duplicate
      const { data: newTask, error: createError } = await supabase
        .from("tasks")
        .insert({
          team_id: original.team_id,
          title: `${original.title} (Copy)`,
          description: original.description,
          priority: original.priority,
          list_id: original.list_id,
          due_date: original.due_date,
          created_by: user.id,
          listing_id: original.listing_id,
        })
        .select()
        .single();

      if (createError || !newTask) throw createError || new Error("Failed to create duplicate");

      // Copy assignees
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);

      if (assignees && assignees.length > 0) {
        await supabase.from("task_assignees").insert(
          assignees.map(a => ({
            task_id: newTask.id,
            user_id: a.user_id,
            assigned_by: user.id,
          }))
        );
      }

      return newTask;
    },
    onMutate: async (taskId) => {
      const previousTasks = queryClient.getQueryData(["tasks"]);
      const tasks = previousTasks as Task[] || [];
      const original = tasks.find(t => t.id === taskId);
      
      if (original) {
        const optimisticTask = {
          ...original,
          id: `temp-${Date.now()}`,
          title: `${original.title} (Copy)`,
          created_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData(["tasks"], [...tasks, optimisticTask]);
      }
      
      return { previousTasks };
    },
    onSuccess: () => {
      toast.success("Task duplicated");
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to duplicate task");
      console.error(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutateAsync,
    updateTask: updateTask.mutate,
    completeTask: completeTask.mutate,
    uncompleteTask: uncompleteTask.mutate,
    addAssignee: addAssignee.mutate,
    removeAssignee: removeAssignee.mutate,
    deleteTask: deleteTask.mutate,
    duplicateTask: duplicateTask.mutate,
  };
};
