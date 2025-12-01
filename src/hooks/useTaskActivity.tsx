import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase
        .from("task_activity")
        .select(`
          *,
          user:profiles!user_id(id, full_name, avatar_url)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TaskActivity[];
    },
    enabled: !!taskId,
  });

  return {
    activities,
    isLoading,
  };
};
