import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface TaskNotification {
  id: string;
  task_id: string;
  assigned_to: string;
  assigned_by: string | null;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  task: {
    id: string;
    title: string;
    due_date: string | null;
    board_id: string;
  } | null;
  assigner: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  board: {
    id: string;
    title: string;
  } | null;
}

export const useTaskNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["task-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("task_assignment_notifications")
        .select(`
          id,
          task_id,
          assigned_to,
          assigned_by,
          read,
          dismissed,
          created_at,
          task:tasks!task_id(
            id,
            title,
            due_date,
            board_id
          ),
          assigner:profiles!assigned_by(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("assigned_to", user.id)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch board info for each task
      const notificationsWithBoards = await Promise.all(
        (data as any[]).map(async (notification) => {
          if (notification.task?.board_id) {
            const { data: boardData } = await supabase
              .from("task_boards")
              .select("id, title")
              .eq("id", notification.task.board_id)
              .single();

            return {
              ...notification,
              board: boardData,
            };
          }
          return notification;
        })
      );

      return notificationsWithBoards as TaskNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000, // 1 minute
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("task-notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_assignment_notifications",
          filter: `assigned_to=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("task_assignment_notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
    },
  });

  const dismissNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("task_assignment_notifications")
        .update({ dismissed: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("task_assignment_notifications")
        .update({ read: true })
        .eq("assigned_to", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutateAsync,
    dismissNotification: dismissNotification.mutateAsync,
    markAllAsRead: markAllAsRead.mutateAsync,
  };
};
