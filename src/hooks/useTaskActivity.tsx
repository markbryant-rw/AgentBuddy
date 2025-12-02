import { useQuery } from "@tanstack/react-query";

interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  activity_type: string;
  metadata: any;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskActivity = (taskId: string) => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: async () => {
      // Feature not yet implemented - return empty array
      return [] as TaskActivity[];
    },
    enabled: !!taskId,
  });

  return {
    activities,
    isLoading,
  };
};
