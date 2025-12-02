import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
      // Feature not yet implemented - return empty array
      return [] as TaskNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const markAsRead = useMutation({
    mutationFn: async (_notificationId: string) => {
      // Not implemented
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
    },
  });

  const dismissNotification = useMutation({
    mutationFn: async (_notificationId: string) => {
      // Not implemented
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // Not implemented
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
