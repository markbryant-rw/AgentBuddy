import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

interface StageMetrics {
  triage: number;
  inProgress: number;
  needsReview: number;
  completed: number;
}

interface KanbanMetrics {
  totalActive: number;
  avgTriageTime: number;
  avgProgressTime: number;
  completionRate: number;
  stageMetrics: StageMetrics;
}

export const useBugKanbanMetrics = () => {
  return useQuery({
    queryKey: ["bug-kanban-metrics"],
    queryFn: async (): Promise<KanbanMetrics> => {
      const { data: bugs, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const activeBugs = bugs?.filter((b) => b.status !== "archived") || [];
      const totalBugs = bugs?.length || 0;
      const fixedBugs = bugs?.filter((b) => b.status === "fixed").length || 0;

      // Calculate avg time in triage (includes old 'investigating' which was migrated to 'triage')
      const triageBugs = bugs?.filter((b) => b.status === "triage") || [];
      const avgTriageTime =
        triageBugs.length > 0
          ? triageBugs.reduce((acc, bug) => {
              return acc + differenceInDays(new Date(), new Date(bug.created_at));
            }, 0) / triageBugs.length
          : 0;

      // Calculate avg time in progress
      const inProgressBugs = bugs?.filter((b) => b.status === "in_progress") || [];
      const avgProgressTime =
        inProgressBugs.length > 0
          ? inProgressBugs.reduce((acc, bug) => {
              return acc + differenceInDays(new Date(), new Date(bug.created_at));
            }, 0) / inProgressBugs.length
          : 0;

      // Calculate completion rate
      const completionRate = totalBugs > 0 ? (fixedBugs / totalBugs) * 100 : 0;

      // Stage metrics - Complete includes both fixed and archived
      const stageMetrics: StageMetrics = {
        triage: bugs?.filter((b) => b.status === "triage").length || 0,
        inProgress: bugs?.filter((b) => b.status === "in_progress").length || 0,
        needsReview: bugs?.filter((b) => b.status === "needs_review").length || 0,
        completed: bugs?.filter((b) => b.status === "fixed" || b.status === "archived").length || 0,
      };

      return {
        totalActive: activeBugs.length,
        avgTriageTime,
        avgProgressTime,
        completionRate,
        stageMetrics,
      };
    },
  });
};

export const useFeatureKanbanMetrics = () => {
  return useQuery({
    queryKey: ["feature-kanban-metrics"],
    queryFn: async (): Promise<KanbanMetrics> => {
      const { data: features, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const activeFeatures = features?.filter((f) => f.status !== "archived") || [];
      const totalFeatures = features?.length || 0;
      const completedFeatures = features?.filter((f) => f.status === "completed").length || 0;

      // Calculate avg time in triage (includes old 'under_consideration' which was migrated to 'triage')
      const triageFeatures = features?.filter((f) => f.status === "triage") || [];
      const avgTriageTime =
        triageFeatures.length > 0
          ? triageFeatures.reduce((acc, feature) => {
              return acc + differenceInDays(new Date(), new Date(feature.created_at));
            }, 0) / triageFeatures.length
          : 0;

      // Calculate avg time in progress
      const inProgressFeatures = features?.filter((f) => f.status === "in_progress") || [];
      const avgProgressTime =
        inProgressFeatures.length > 0
          ? inProgressFeatures.reduce((acc, feature) => {
              return acc + differenceInDays(new Date(), new Date(feature.created_at));
            }, 0) / inProgressFeatures.length
          : 0;

      // Calculate completion rate
      const completionRate = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;

      // Stage metrics - Complete includes both completed and archived
      const stageMetrics: StageMetrics = {
        triage: features?.filter((f) => f.status === "triage").length || 0,
        inProgress: features?.filter((f) => f.status === "in_progress").length || 0,
        needsReview: features?.filter((f) => f.status === "needs_review").length || 0,
        completed: features?.filter((f) => f.status === "completed" || f.status === "archived").length || 0,
      };

      return {
        totalActive: activeFeatures.length,
        avgTriageTime,
        avgProgressTime,
        completionRate,
        stageMetrics,
      };
    },
  });
};
