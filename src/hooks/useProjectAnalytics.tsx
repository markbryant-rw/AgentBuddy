import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Stubbed hook - project analytics feature coming soon
export const useProjectAnalytics = (filters?: {
  stage?: string;
  userId?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project-analytics", user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      // Return empty analytics data - feature coming soon
      return {
        byStage: {
          call: [],
          vap: [],
          map: [],
          lap: [],
          won: [],
          lost: [],
          manual: [],
        },
        progress: [],
        avgDurationByStage: {},
        statusDistribution: {
          active: 0,
          completed: 0,
          on_hold: 0,
        },
        totalProjects: 0,
      };
    },
    enabled: !!user,
  });
};